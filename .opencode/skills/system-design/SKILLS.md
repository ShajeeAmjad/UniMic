---
name: system-design
description: Work through end-to-end system design problems — requirements gathering, capacity estimation, component design, and failure analysis
license: MIT
compatibility: opencode
metadata:
  audience: engineers
  workflow: design
---
## What I do

- Drive structured system design sessions from vague brief to concrete proposal
- Clarify functional and non-functional requirements before proposing any solution
- Produce back-of-envelope capacity estimates: QPS, storage, bandwidth, memory
- Design high-level architecture: client, API layer, services, data stores, caches, queues, CDN
- Choose and justify data storage solutions (relational, document, wide-column, time-series, blob)
- Design for scale: horizontal scaling, sharding, replication, partitioning strategies
- Address reliability: replication, failover, circuit breakers, retries with backoff, idempotency
- Address observability: metrics, structured logging, distributed tracing, alerting strategy
- Identify and mitigate single points of failure and hotspot bottlenecks
- Produce Mermaid system diagrams and data flow diagrams on request

## When to use me

Use this skill when:

- Designing a new system or major feature from scratch
- Preparing for a system design interview and wanting structured practice
- Evaluating whether a current design will hold up under projected load
- Exploring trade-offs between architectural approaches before committing

Always state: expected scale (users, requests/sec, data volume), latency/availability targets, and any hard constraints (cloud provider, budget, existing stack).
If requirements are vague, I will ask clarifying questions before proposing a design — jumping straight to solutions without agreed requirements produces poor designs.

## Output conventions

- Sessions follow this sequence: Requirements → Estimates → High-Level Design → Deep Dives → Trade-offs → Open Questions
- Capacity estimates are shown as explicit calculations, not just conclusions
- Component diagrams default to Mermaid `graph TD`
- Trade-off comparisons use a three-column table: **Option**, **Pros**, **Cons**
- All significant choices include a brief justification tied back to the stated requirements
