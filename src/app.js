const fastify = require("fastify");
const { resolveRoute } = require("./proxy/routeResolver");
const { forwardRequest } = require("./proxy/forwarder");
const apiKeys = require("./config/apiKeys");
const protectedRoutes = require("./config/protectedRoutes");

function buildApp() {
  const app = fastify({
    logger: true,
  });

  // LOGGING
  app.addHook("onRequest", async (request) => {
    request.log.info(
      { method: request.method, url: request.url },
      "incoming request",
    );
  });

  // CLIENT IDENTIFICATION
  app.addHook("preHandler", async (request, reply) => {
    const apiKey = request.headers["x-api-key"];

    // No API key → anonymous client
    if (!apiKey) {
      request.client = { type: "anonymous" };
      return;
    }

    const client = apiKeys[apiKey];

    // Invalid API key → reject early
    if (!client) {
      reply.code(401).send({ error: "Invalid API key" });
      return reply;
    }

    // Valid API key → identified client
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
      reply.code(401).send({ error: "API key required" });
      return reply;
    }
  });

  // CENTRAL ROUTING
  app.addHook("preHandler", async (request, reply) => {
    const result = resolveRoute(request.url);

    if (!result) {
      reply.code(404).send({ error: "No route found" });
      return;
    }

    request.routeInfo = result;

    request.log.info(
      { target: result.target, prefix: result.prefix },
      "route resolved",
    );
  });

  // HEALTH CHECK
  app.get("/health", async () => {
    return { status: "ok" };
  });

  // Catch-all route for gateway traffic
  app.all("*", async (request, reply) => {
    return forwardRequest(request, reply);
  });

  return app;
}

module.exports = buildApp;
