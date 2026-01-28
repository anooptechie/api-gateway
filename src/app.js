const fastify = require("fastify");

function buildApp() {
  const app = fastify({
    logger: true,
  });

  app.get("/health", async () => {
    return { status: "ok" };
  });

  return app;
}

module.exports = buildApp;
