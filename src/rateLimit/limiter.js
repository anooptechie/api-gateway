const {get, set} = require("./store")
const rateLimits = require("../config/rateLimits")


function rateLimit(request) {
  const clientType = request.client.type;
  const clientKey =
    clientType === "identified"
      ? request.client.apiKey
      : "anonymous";

  const { limit, windowMs } = rateLimits[clientType];

  const now = Date.now();
  const record = get(clientKey);

  if (!record || now > record.resetAt) {
    set(clientKey, {
      count: 1,
      resetAt: now + windowMs
    });
    return { allowed: true };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.ceil((record.resetAt - now) / 1000)
    };
  }

  record.count += 1;
  set(clientKey, record);

  return { allowed: true };
}

module.exports = { rateLimit };
