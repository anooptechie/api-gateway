// const axios = require("axios")

// async function forwardRequest(request, reply) {
//   const { target, prefix } = request.routeInfo;

//   // Remove the route prefix before forwarding
//   const downstreamPath = request.url.replace(prefix, "");
//   const url = `${target}${downstreamPath}`;

//   try {
//     const response = await axios({
//       method: request.method,
//       url,
//       headers: request.headers,
//       data: request.body,
//       validateStatus: () => true, // do not throw on non-2xx
//     });

//     reply.code(response.status).send(response.data);
//   } catch (err) {
//     request.log.error(err, "downstream request failed");
//     reply.code(502).send({ error: "Bad Gateway" });
//   }
// }

// module.exports = { forwardRequest };

const axios = require("axios");

const {
  isCircuitOpen,
  recordFailure,
  recordSuccess,
} = require("../circuitBreaker");

// Downstream timeout (ms)
const DOWNSTREAM_TIMEOUT = 3000;

async function forwardRequest(request, reply) {
  const { target, prefix } = request.routeInfo;

  // Derive service name: /api/inventory → inventory
  const serviceName = prefix.replace("/api/", "");

  // 🔴 Circuit breaker: fail fast
  if (isCircuitOpen(serviceName)) {
    reply.code(503).send({
      error: "Service temporarily unavailable",
    });
    return;
  }

  // Remove the route prefix before forwarding
  const downstreamPath = request.url.replace(prefix, "");
  const url = `${target}${downstreamPath}`;

  try {
    const response = await axios({
      method: request.method,
      url,
      headers: request.headers,
      data: request.body,
      timeout: DOWNSTREAM_TIMEOUT,
      validateStatus: () => true, // do not throw on non-2xx
    });

    // 🧠 Record failure on 5xx, success otherwise
    if (response.status >= 500) {
      recordFailure(serviceName);
    } else {
      recordSuccess(serviceName);
    }

    reply.code(response.status).send(response.data);
  } catch (err) {
    // Timeout or network error
    recordFailure(serviceName);

    request.log.error(err, "downstream request failed");
    reply.code(502).send({ error: "Bad Gateway" });
  }
}

module.exports = { forwardRequest };
