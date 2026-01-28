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

Further phases build on this foundation without changing its core behavior.

