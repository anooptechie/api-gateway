const buildApp = require("./app");

const app = buildApp();

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    const address = await app.listen({ port: PORT });
    console.log(`API Gateway listening at ${address}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
