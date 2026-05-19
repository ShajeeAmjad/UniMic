---
name: code-review
description: Review code for correctness, security, performance, maintainability, and style — with actionable, prioritised feedback
license: MIT
compatibility: opencode
metadata:
  audience: engineers
  workflow: review
---
## What I do

- Identify bugs, logic errors, and edge cases the author may have missed
- Flag security vulnerabilities (injection, auth bypass, insecure defaults, secrets in code, etc.)
- Spot performance issues: unnecessary allocations, N+1 queries, blocking calls, inefficient algorithms
- Evaluate naming, readability, and adherence to the single-responsibility principle
- Check error handling: missing checks, swallowed exceptions, inconsistent failure modes
- Assess test coverage quality — not just presence but meaningfulness of assertions
- Verify API/interface design for consistency, backwards compatibility, and ease of use
- Comment on dependency choices and version pinning hygiene
- Produce feedback grouped by severity: **Critical**, **Major**, **Minor**, **Nit**

## When to use me

Use this skill when:

- Reviewing a pull request or diff before merge
- Auditing a module or file for quality before release
- Doing a targeted security review of authentication, authorisation, or data-handling code
- Onboarding and wanting detailed explanation of why certain patterns are preferred

State the language, framework, and any relevant coding standards or style guides upfront.
If reviewing a diff, provide the full context of changed files where possible — partial snippets limit the depth of review.

## Output conventions

- Feedback is grouped under **Critical**, **Major**, **Minor**, **Nit** headings
- Each item includes: file + line reference (if available), the issue, and a concrete suggested fix or alternative
- A short summary section at the top gives an overall assessment before the detailed comments
- Positive observations are noted briefly — good patterns are worth reinforcing
