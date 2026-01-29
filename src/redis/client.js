const { createClient } = require("redis");

const client = createClient({
  url: process.env.REDIS_URL,
  socket: {
    // Increased timeout to 10 seconds to allow for slow TLS handshakes
    connectTimeout: 10000,
    // Exponential backoff strategy: retries get slightly longer each time
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        return new Error("Redis reconnection failed after 10 attempts");
      }
      // Reconnect after 100ms, 200ms, etc., up to 3 seconds
      return Math.min(retries * 100, 3000);
    },
  },
});

client.on("error", (err) => {
  console.error("Redis error:", err);
});

async function connectRedis() {
  try {
    if (!client.isOpen) {
      await client.connect();
      console.log("Connected to Redis successfully");
    }
  } catch (err) {
    console.error("Failed to connect to Redis during startup:", err);
    throw err; // Re-throw so server.js can handle the process exit
  }
}

module.exports = { client, connectRedis };