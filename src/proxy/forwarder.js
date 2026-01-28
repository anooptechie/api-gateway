const axios = require("axios")

async function forwardRequest(request, reply) {
  const { target, prefix } = request.routeInfo;

  // Remove the route prefix before forwarding
  const downstreamPath = request.url.replace(prefix, "");
  const url = `${target}${downstreamPath}`;

  try {
    const response = await axios({
      method: request.method,
      url,
      headers: request.headers,
      data: request.body,
      validateStatus: () => true, // do not throw on non-2xx
    });

    reply.code(response.status).send(response.data);
  } catch (err) {
    request.log.error(err, "downstream request failed");
    reply.code(502).send({ error: "Bad Gateway" });
  }
}

module.exports = { forwardRequest };
