require("dotenv").config();

const buildApp = require("./app");
const { connectRedis } = require("./redis/client");

const app = buildApp();

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // Connect to Redis BEFORE starting the server
    await connectRedis();

    const address = await app.listen({ port: PORT });
    console.log(`API Gateway listening at ${address}`);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
