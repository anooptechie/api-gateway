const fastify = require("fastify");
const { resolveRoute } = require("./proxy/routeResolver");
const { forwardRequest } = require("./proxy/forwarder");

function buildApp() {
  const app = fastify({
    logger: true,
  });

  // GLOBAL INGRESS
  app.addHook("onRequest", async (request) => {
    request.log.info(
      { method: request.method, url: request.url },
      "incoming request",
    );
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
