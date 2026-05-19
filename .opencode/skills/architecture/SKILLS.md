---
name: architecture
description: Design systems, document architecture decisions, and produce ADRs, C4 diagrams, and technical specs for new or existing codebases
license: MIT
compatibility: opencode
metadata:
  audience: engineers
  workflow: design
---
## What I do

- Produce Architecture Decision Records (ADRs) in standard format (title, status, context, decision, consequences)
- Design system architecture using C4 model levels (Context, Container, Component, Code)
- Recommend technology choices with explicit trade-off reasoning
- Identify architectural patterns appropriate to the problem (e.g. layered, event-driven, CQRS, hexagonal)
- Review existing architecture for coupling, scalability, and separation-of-concerns issues
- Produce data flow diagrams, sequence diagrams, and component relationship maps in Mermaid
- Define service boundaries, API contracts, and integration strategies
- Advise on non-functional requirements: latency, fault tolerance, observability, security posture

## When to use me

Use this skill when:

- Starting a new service, module, or system from scratch and needing a design before coding
- Evaluating a proposed change that touches multiple components
- Writing an ADR to document a significant technical choice
- Onboarding contributors who need a high-level picture of how the system is structured
- Refactoring and needing to identify the target architecture before moving code

Ask clarifying questions if the deployment environment, scale requirements, or team constraints are not stated — these significantly affect recommendations.

## Output conventions

- ADRs use the Nygard format: `## Title`, `## Status`, `## Context`, `## Decision`, `## Consequences`
- Diagrams default to Mermaid (`graph TD` or `sequenceDiagram`) unless another format is requested
- Trade-off tables use three columns: **Option**, **Pros**, **Cons**
- Component descriptions include: responsibility, dependencies in, dependencies out, and data owned
