const axios = require("axios");
const { increment } = require("../metrics/store");

const {
  isCircuitOpen,
  recordFailure,
  recordSuccess,
} = require("../circuitBreaker");

const DOWNSTREAM_TIMEOUT = 3000;

async function forwardRequest(request, reply) {
  const { target, prefix } = request.routeInfo;
  const serviceName = prefix.replace("/api/", "");

  // CIRCUIT BREAKER
  if (isCircuitOpen(serviceName)) {
    increment("circuit_blocked_requests");

    request.log.warn(
      { service: serviceName, url: request.url },
      "circuit open, request blocked",
    );

    reply.code(503).send({
      error: "Service temporarily unavailable",
    });
    return;
  }

  const downstreamPath = request.url.replace(prefix, "");
  const url = `${target}${downstreamPath}`;

  // PROPAGATE CORRELATION ID
  const headers = {
    ...request.headers,
    "x-correlation-id": request.correlationId,
  };

  try {
    const response = await axios({
      method: request.method,
      url,
      headers,
      data: request.body,
      timeout: DOWNSTREAM_TIMEOUT,
      validateStatus: () => true,
    });

    if (response.status >= 500) {
      increment("downstream_failures");
      recordFailure(serviceName);

      request.log.warn(
        {
          service: serviceName,
          status: response.status,
          url: request.url,
        },
        "downstream service error",
      );
    } else {
      increment("successful_requests");
      recordSuccess(serviceName);

      request.log.info(
        {
          service: serviceName,
          status: response.status,
          url: request.url,
        },
        "request successfully proxied",
      );
    }

    reply.code(response.status).send(response.data);
  } catch (err) {
    increment("downstream_failures");
    recordFailure(serviceName);

    request.log.error(
      { service: serviceName, url: request.url, err },
      "downstream request failed",
    );

    reply.code(502).send({ error: "Bad Gateway" });
  }
}

module.exports = { forwardRequest };
