const fastify = require("fastify");
const { resolveRoute } = require("./proxy/routeResolver");
const { forwardRequest } = require("./proxy/forwarder");
const apiKeys = require("./config/apiKeys");
const protectedRoutes = require("./config/protectedRoutes");
const { rateLimit } = require("./rateLimit/redisLimiter");
const OPERATIONAL_ROUTES = ["/health", "/health/metrics"];
const { increment, getMetrics } = require("./metrics/store");
const { randomUUID } = require("crypto");

function buildApp() {
  const app = fastify({
    logger: {
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
      // serializers: {
      //   req: () => undefined,
      //   res: () => undefined,
      // },
    },
    disableRequestLogging: true,
  });

  // REQUEST ENTRY LOG
  app.addHook("onRequest", async (request) => {
    const incoming = request.headers["x-correlation-id"];
    const correlationId = incoming || randomUUID();

    request.correlationId = correlationId;

    // enrich logger with correlationId
    request.log = request.log.child({ correlationId });

    request.log.info(
      { method: request.method, url: request.url },
      "incoming request",
    );
  });

  // RETURN CORRELATION ID TO CLIENT
  app.addHook("onSend", async (request, reply, payload) => {
    if (request.correlationId) {
      reply.header("x-correlation-id", request.correlationId);
    }
    return payload;
  });

  // CLIENT IDENTIFICATION
  app.addHook("preHandler", async (request, reply) => {
    const apiKey = request.headers["x-api-key"];

    if (!apiKey) {
      request.client = { type: "anonymous" };
      return;
    }

    const client = apiKeys[apiKey];

    if (!client) {
      request.log.warn({ url: request.url }, "invalid api key provided");
      reply.code(401).send({ error: "Invalid API key" });
      return reply;
    }

    request.client = {
      type: "identified",
      apiKey,
      name: client.name,
    };
  });

  // PROTECTED ROUTE ENFORCEMENT
  app.addHook("preHandler", async (request, reply) => {
    const isProtected = protectedRoutes.some((prefix) =>
      request.url.startsWith(prefix),
    );

    if (isProtected && request.client?.type !== "identified") {
      request.log.warn(
        { url: request.url },
        "protected route accessed without api key",
      );
      reply.code(401).send({ error: "API key required" });
      return reply;
    }
  });

  // RATE LIMITING
  app.addHook("preHandler", async (request, reply) => {
    increment("total_requests");

    if (OPERATIONAL_ROUTES.includes(request.url)) {
      return;
    }

    const result = await rateLimit(request);

    if (!result.allowed) {
      increment("rate_limited_requests");

      request.log.warn(
        {
          url: request.url,
          retryAfter: result.retryAfter,
        },
        "request rate limited",
      );

      reply
        .code(429)
        .header("Retry-After", result.retryAfter)
        .send({ error: "Too many requests" });
      return reply;
    }
  });

  // CENTRAL ROUTING
  app.addHook("preHandler", async (request, reply) => {
    if (OPERATIONAL_ROUTES.includes(request.url)) {
      return;
    }

    const result = resolveRoute(request.url);

    if (!result) {
      request.log.warn({ url: request.url }, "no route found");
      reply.code(404).send({ error: "No route found" });
      return;
    }

    request.routeInfo = result;

    request.log.info(
      { target: result.target, prefix: result.prefix },
      "route resolved",
    );
  });

  // HEALTH CHECKS
  app.get("/health", async () => {
    return { status: "ok" };
  });
  // HEALTH METRICS
  app.get("/health/metrics", async () => {
    return getMetrics();
  });

  // GATEWAY CATCH-ALL
  app.all("*", async (request, reply) => {
    if (OPERATIONAL_ROUTES.includes(request.url)) {
      return;
    }
    return forwardRequest(request, reply);
  });

  return app;
}

module.exports = buildApp;
