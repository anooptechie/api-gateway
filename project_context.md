# PROJECT_CONTEXT — Phase 1

## Purpose

This project is a **learning-focused infrastructure system** built to understand how API Gateways work internally.

It is not a business application. The goal is to build a clean, minimal gateway from scratch and progressively add real-world capabilities.

---

## Why an API Gateway

In real backend systems:

* Multiple services exist behind a single public interface
* Traffic must be routed, controlled, and observed
* Failures in one service should not directly impact others

An API Gateway sits at the system boundary and handles these cross-cutting concerns.

---

## Phase 1 Intent

Phase 1 focuses on **request flow**, not protection.

The intent is to:

* Establish a single ingress point
* Build a clear and observable request pipeline
* Separate routing decisions from proxying behavior
* Avoid premature features and overengineering

---

## Design Principles

* Explicit over implicit behavior
* Configuration-driven routing
* No business logic inside the gateway
* Fail fast on invalid routes
* Keep downstream services isolated

---

## Architectural Boundaries

* The gateway does not implement authentication or authorization
* Downstream services are external systems
* All client traffic flows through the gateway
* The gateway does not transform domain data

---

## Technology Choice

Fastify is used for this project because:

* It provides clear request lifecycle hooks
* It suits infrastructure-style services
* It encourages structured, predictable pipelines

The overall architecture is framework-agnostic.

---

## How Phase 1 Enables Future Phases

Phase 1 establishes the foundation for:

* Phase 2: Client identification (API keys)
* Phase 3: Distributed rate limiting
* Phase 4: Resiliency and circuit breakers
* Phase 5: Observability and metrics

Each future phase builds on the same pipeline introduced here.

---

## Status

Phase 1 is complete and should be treated as **stable and frozen**.

All further work should extend this design without altering its core assumptions.
