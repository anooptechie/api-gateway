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


