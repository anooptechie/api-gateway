const rateLimits = require("../config/rateLimits");
const { client } = require("../redis/client");

// The Lua script handles INCR, EXPIRE, and PTTL in one atomic step in Redis memory.
const LUA_SCRIPT = `
  local current = redis.call("INCR", KEYS[1])
  if current == 1 then
    redis.call("PEXPIRE", KEYS[1], ARGV[1])
  end
  local ttl = redis.call("PTTL", KEYS[1])
  return {current, ttl}
`;

async function rateLimit(request) {
  try {
    const clientType = request.client.type;

    // Fixed: Using request.ip to ensure anonymous users have unique buckets
    const key =
      clientType === "identified"
        ? `rate:${request.client.apiKey}`
        : `rate:anonymous:${request.ip}`;

    const { limit, windowMs } = rateLimits[clientType];

    // EXECUTE THE LUA SCRIPT
    // This replaces the multiple await calls and prevents race conditions.
    const [count, ttl] = await client.eval(LUA_SCRIPT, {
      keys: [key],
      arguments: [windowMs.toString()],
    });

    if (count > limit) {
      return {
        allowed: false,
        // Using the TTL returned directly from the script for accuracy
        retryAfter: Math.ceil(ttl / 1000),
      };
    }

    return { allowed: true };
  } catch (err) {
    // Fail OPEN — Redis issues must not crash the gateway
    console.error("Rate limiter error, allowing request:", err.message);
    return { allowed: true };
  }
}

module.exports = { rateLimit };
