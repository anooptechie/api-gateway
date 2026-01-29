# API Gateway — Phase 1

## Overview

This project implements a **basic API Gateway** using Node.js and Fastify.

The gateway acts as a **single entry point** for client traffic and forwards requests to downstream services based on configuration. It focuses purely on request flow and routing, not business logic.

This README documents **Phase 1 only**.

---

## What Phase 1 Does

Phase 1 builds the **core gateway pipeline**.

In this phase, the gateway:

* Starts a Fastify server
* Exposes a `/health` endpoint
* Logs all incoming requests centrally
* Resolves routes using configuration (`routes.json`)
* Forwards requests to downstream services (reverse proxy)

---

## What Phase 1 Does NOT Do

Phase 1 intentionally excludes:

* Authentication or login systems
* API key validation
* Rate limiting
* Circuit breakers or retries
* Metrics or dashboards

These are added in later phases.

---

## Request Flow (Phase 1)

```
Client
  → API Gateway
      → Logging (onRequest)
      → Route Resolution (preHandler)
      → Catch-all Gateway Handler
      → Reverse Proxy Forwarding
          → Downstream Service
```

The gateway does not modify request or response payloads.

---

## Routing Configuration

Routes are defined using a configuration file:

```
src/config/routes.json
```

Example:

```json
{
  "/api/inventory": "http://localhost:4001",
  "/api/orders": "http://localhost:4002"
}
```

The gateway matches request paths using **prefix matching** and forwards traffic accordingly.

---

## Health Endpoint

```
GET /health
```

Response:

```json
{ "status": "ok" }
```

This endpoint only indicates that the gateway process is running.

---

## Downstream Services

Downstream services are **external to the gateway**.

For local testing, simple standalone services (for example, an inventory service running on port `4001`) are used. These services:

* Run as separate processes
* Are not part of the gateway codebase
* Are treated as black boxes by the gateway

---

## Phase 1 Status

Phase 1 is **complete and stable**.

# API Gateway — Phase 2

## Overview

Phase 2 extends the API Gateway by introducing **client identification**.

While Phase 1 focused on request flow and routing, Phase 2 answers a new question:

> **Who is calling the gateway?**

This phase adds lightweight identity handling without introducing full authentication systems.

---

## What Phase 2 Does

In Phase 2, the gateway:

* Identifies clients using an `x-api-key` request header
* Distinguishes between **anonymous** and **identified** clients
* Rejects requests with invalid API keys early
* Protects specific routes from anonymous access
* Continues forwarding allowed requests to downstream services

All logic is enforced **before** proxying traffic.

---

## What Phase 2 Does NOT Do

Phase 2 intentionally does **not** include:

* Login or user authentication systems
* JWTs or OAuth flows
* Role-based authorization
* Rate limiting or quotas
* Persistent storage or databases

Identity handling is deliberately simple and scoped.

---

## Client Identification

Clients may send an API key using the header:

```
x-api-key: <key>
```

Based on this header, the gateway classifies requests as:

* **Anonymous** — no API key provided
* **Identified** — valid API key provided
* **Invalid** — API key provided but not recognized

Client identity is attached to the request context and reused by later pipeline stages.

---

## Protected Routes

Some routes require an identified client.

Protected route prefixes are defined using configuration:

```
src/config/protectedRoutes.js
```

Example:

```js
module.exports = [
  "/api/orders"
];
```

Requests to protected routes:

* Are rejected if no API key is provided
* Are rejected if the API key is invalid
* Are forwarded only when a valid API key is present

---

## Request Flow (Phase 2)

```
Client
  → API Gateway
      → Logging (onRequest)
      → Client Identification
      → Protected Route Check
      → Route Resolution
      → Reverse Proxy Forwarding
          → Downstream Service
```

Requests that fail identification or access checks are rejected before reaching downstream services.

---

## Error Handling

Common responses introduced in Phase 2:

* `401 Invalid API key`
* `401 API key required`

These errors are returned directly by the gateway.

---

## Phase 2 Status

Phase 2 is **complete and stable**.

The gateway now understands **who** is calling it and can enforce basic access rules. This forms the foundation for rate limiting and traffic control in future phases.

API Gateway — Phase 3

Phase 3 adds distributed rate limiting to the API Gateway.

The gateway now actively protects downstream services by controlling how frequently clients can make requests, even when the gateway is running on multiple instances.

What Phase 3 Does

In Phase 3, the gateway:

Enforces per-client request limits

Uses Redis as a shared counter store

Applies limits consistently across instances

Returns 429 Too Many Requests when limits are exceeded

Includes a Retry-After header

Rate limiting occurs before requests are proxied downstream.

Rate Limiting Strategy

Fixed window rate limiting

Atomic execution using Redis Lua scripting

Separate buckets for:

Identified clients (API key)

Anonymous clients (IP address)

This avoids race conditions and shared-bucket issues common in naive implementations.

Request Flow (Phase 3)
Client
  → API Gateway
      → Logging
      → Client Identification
      → Rate Limiting (Redis + Lua)
      → Route Resolution
      → Reverse Proxy Forwarding
          → Downstream Service

Requests that exceed limits are rejected early.

Error Handling

New responses introduced in Phase 3:

429 Too Many Requests

Retry-After header indicating wait time

These errors are generated by the gateway and never reach downstream services.

Design Notes

Redis Lua scripts guarantee atomicity

Rate limiting state survives gateway restarts

Anonymous traffic is isolated per IP

A detailed debugging and learning write-up is available in the Phase 3 Postmortem.

Phase 3 Status

Phase 3 is complete, stable, and frozen.

The gateway now enforces traffic control reliably and safely.

# API Gateway — Phase 4: Resiliency & Circuit Breaker

## Overview

Phase 4 introduces **resiliency** into the API Gateway by implementing a **Circuit Breaker**.

While earlier phases focused on routing, identity, and traffic control, Phase 4 protects the **gateway itself** from unhealthy downstream services. The gateway now fails fast instead of waiting on slow or broken services, preventing cascading failures.

---

## Why Phase 4 Matters

Without a circuit breaker:

* Slow or down services cause request pile‑ups
* The gateway’s event loop gets blocked
* One failing service can degrade the entire system

With a circuit breaker:

* Failures are isolated
* The gateway remains responsive
* Downstream services are given time to recover

---

## What Phase 4 Does

The gateway now:

* Tracks downstream failures per service
* Opens a circuit after consecutive failures
* Immediately rejects requests while a circuit is open
* Automatically recovers after a cooldown period

All logic is intentionally **local and in‑memory** to keep behavior predictable and easy to reason about.

---

## Circuit Breaker Rules

The circuit breaker follows simple, deterministic rules:

* **Failure conditions**:

  * Request timeout
  * Network error
  * Downstream `5xx` response

* **Failure threshold**: `3` consecutive failures

* **Cooldown period**: `30 seconds`

After the threshold is reached, the circuit opens and the gateway responds immediately.

---

## Error Behavior

When a circuit is open, the gateway responds with:

```json
{
  "error": "Service temporarily unavailable"
}
```

HTTP status:

```
503 Service Unavailable
```

This response is generated by the gateway and never reaches the downstream service.

---

## Request Flow (Phase 4)

```
Client
 → Logging
 → Client Identification
 → Rate Limiting
 → Circuit Breaker
 → Route Resolution
 → Proxy Forwarding
     → Downstream Service
```

If the circuit is open, the flow stops at the circuit breaker.

---

## Design Notes

* Circuit breaker state is **per downstream service**
* No shared or distributed breaker state
* No retries or half‑open probing (intentionally deferred)
* No external circuit breaker libraries

This mirrors how gateways often introduce resiliency incrementally.

---

## Phase 4 Status

Phase 4 is **complete and frozen**.

The gateway now actively protects itself from downstream failures and provides predictable fail‑fast behavior.
