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

# PROJECT_CONTEXT — Phase 2

## Phase Focus

Phase 2 focuses on **client identity**, not traffic control.

With routing and proxying already established in Phase 1, this phase introduces the ability for the gateway to understand **who is making a request** and apply access rules accordingly.

---

## Why Client Identification Matters

Without client identity:

* All traffic is treated the same
* Sensitive routes cannot be protected
* Usage cannot be attributed to callers
* Rate limiting is not possible

Client identification is a prerequisite for most real-world gateway features.

---

## Design Intent (Phase 2)

The intent of Phase 2 is to:

* Introduce identity with minimal complexity
* Avoid authentication systems and user management
* Classify requests early in the pipeline
* Block unauthorized traffic before proxying

The gateway remains a **boundary system**, not an auth service.

---

## Identity Model

Phase 2 uses a **header-based API key model**:

* API keys are static and in-memory
* Keys map to simple client descriptors
* Identity is attached to the request context

This model is intentionally limited but sufficient for learning and extension.

---

## Architectural Boundaries

In Phase 2:

* The gateway identifies clients but does not authenticate users
* Downstream services trust the gateway to enforce access rules
* No identity data is persisted or shared externally

These boundaries prevent scope creep and keep responsibilities clear.

---

## Failure Philosophy (Phase 2)

The gateway follows a **fail-fast** approach:

* Invalid API keys are rejected immediately
* Anonymous access to protected routes is blocked early
* Downstream services are not contacted for unauthorized requests

This reduces load and limits the blast radius of bad traffic.

---

## Relationship to Future Phases

Phase 2 enables:

* Phase 3: Rate limiting per client
* Phase 4: Failure isolation and circuit breakers
* Phase 5: Per-client observability and metrics

Without client identity, these features would not be meaningful.

---

## Status

Phase 2 is complete and should be considered **stable**.

Future phases should build on the client identity model introduced here without changing its core assumptions.

Phase 3

Phase 3 introduces traffic control through distributed rate limiting.

With client identity (Phase 2) already in place, the gateway now enforces usage limits consistently across instances to protect downstream services from abuse and overload.

Why Rate Limiting Matters

Without rate limiting:

A single client can overwhelm backend services

Traffic spikes can cascade into failures

Fair usage cannot be enforced

In real systems, rate limiting is a core gateway responsibility.

Design Intent (Phase 3)

The intent of Phase 3 is to:

Enforce limits per client, not globally

Work correctly across multiple gateway instances

Avoid in-memory counters that fail in distributed setups

Fail fast at the gateway boundary

Correctness and predictability are prioritized over cleverness.

Implementation Summary

Phase 3 uses Redis as a shared state store and Lua scripting for atomic execution.

Key characteristics:

Atomic rate limiting using a Redis Lua script

Fixed window strategy

Separate buckets for:

Identified clients (API key based)

Anonymous clients (IP based)

Correct TTL handling for reliable resets

This matches production-grade gateway designs.

Architectural Boundaries

In Phase 3:

The gateway enforces limits but does not bill or monetize usage

Downstream services are shielded from abusive traffic

Redis is used only for counters, not business data

Relationship to Future Phases

Phase 3 enables:

Phase 4: Circuit breakers and failure isolation

Phase 5: Metrics and observability

Traffic control is a prerequisite for safe resiliency features.

Status

Phase 3 is complete and frozen.

The final implementation is atomic, distributed, and production-aligned.

# PROJECT_CONTEXT — Phase 4: Resiliency & Circuit Breaker

## Phase Focus

Phase 4 focuses on **resiliency**.

The goal is to prevent downstream service failures from cascading into gateway‑wide outages. This phase treats the API Gateway as a defensive boundary that must protect itself under failure conditions.

---

## Problem Being Solved

Even with rate limiting in place, downstream services can:

* Become slow
* Return repeated errors
* Go completely offline

Without protection, the gateway would continue forwarding requests, increasing latency and risking instability.

---

## Design Intent

The design intent of Phase 4 is to:

* Detect unhealthy downstream services
* Stop sending traffic to them temporarily
* Fail fast and return meaningful errors
* Automatically recover without manual intervention

Correctness and predictability are prioritized over sophistication.

---

## Circuit Breaker Design

Phase 4 implements a **local, in‑memory circuit breaker** with the following characteristics:

* One circuit per downstream service
* Consecutive failure counting
* Fixed cooldown window
* Automatic reset after cooldown

This approach avoids distributed coordination while still delivering real resiliency benefits.

---

## Architectural Boundaries

In Phase 4:

* Circuit breaker state is not shared across gateway instances
* Redis is intentionally not used
* No retries are attempted by the gateway
* No half‑open probing is performed

These features are deferred to future iterations.

---

## Interaction with Other Phases

* **Phase 2** provides client identity
* **Phase 3** controls request volume
* **Phase 4** controls failure propagation

Rate limiting and circuit breaking operate at different layers and complement each other.

---

## Lessons Reinforced

* Not all failures are traffic problems
* Failing fast is often safer than waiting
* Layered defenses can interfere during testing
* Resiliency logic belongs around downstream calls

---

## Status

Phase 4 is **complete and frozen**.

The gateway now includes foundational resiliency behavior and is ready for observability enhancements in future phases.
