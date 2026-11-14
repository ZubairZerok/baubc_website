# BAUBC Club Operating System: Implementation Blueprint

Research-backed blueprint for the Bangladesh Agricultural University Business Club (BAUBC) platform: a premium bilingual public website connected to an internal club operating system (membership, teacher approvals, HR tasks and points, events with live seats, finance, integrations and verifiable documents).

> **Status:** for review and approval, prepared 14 November 2026. **No application code has been written.** Implementation starts only after the decisions in [Document 12 §7](12-executive-summary.md#7-decisions-needed-before-coding-begins) are answered.

## Start here

1. **[Executive Summary](12-executive-summary.md)**: recommendation, limitations, risks, MVP and the decisions needed.
2. **[Design direction specimen](design-direction.html)**: the proposed "Field & Signal" visual system (open it in a browser).

## Documents

| # | Document | What it covers |
|---|---|---|
| 1 | [Product Requirements](01-product-requirements.md) | Requirement inventory (PUB, AUTH, MEM, FAC, HR, EVT, FIN, INT, PERF, DOC, ADM, PERK, PRIV, NFR), contradictions in the brief and how they are resolved |
| 2 | [Roles and Permissions](02-roles-permissions.md) | RBAC with scopes and mandates, the full permission matrix, separation-of-duties rules, enforcement architecture |
| 3 | [System Architecture](03-system-architecture.md) | Technology decisions with comparisons, diagrams for every layer, environments, monitoring and backup |
| 4 | [Database Design](04-database-design.md) | ERDs, table specifications, invariants as SQL, risks, indexing, migrations, retention |
| 5 | [Workflow Specifications](05-workflows.md) | State machines for 19 workflows: registration, membership, approvals, tasks, points, events, seats, payments, refunds, Gmail, Facebook, certificates |
| 6 | [UI/UX Design Brief](06-ux-design-brief.md) | Creative directions, page map, journeys, wireframes, design system, typography (English and Bangla), motion, role dashboards |
| 7 | [Integration Feasibility](07-integration-feasibility.md) | Gmail, Workspace, Facebook, bKash incoming and outgoing, storage, notifications, jobs, and feasibility spikes |
| 8 | [Security and Risk Audit](08-security-risk-audit.md) | Threat model, controls, legal position (PDPA 2026), 89-item ranked risk register, incident response |
| 9 | [Implementation Roadmap](09-implementation-roadmap.md) | A dependency-aware plan with a Summit fast-track and a go/no-go gate |
| 10 | [Testing and Acceptance](10-testing-acceptance.md) | Unit, DB, permission matrix, workflow, financial, realtime, mobile, accessibility and security tests, plus UAT |
| 11 | [Cost and Infrastructure](11-cost-infrastructure.md) | Current pricing, starter, lean and scalable configurations |
| 12 | [Executive Summary](12-executive-summary.md) | Decisions, risks, MVP |
| 13 | [Sources](13-sources.md) | Verification log, with each fact marked as official, secondary or measured |

## Privacy note for this public repository

This repository is public. Personal identifiers from the brief (the primary administrator's personal email address and the payment-receiving phone number) are **intentionally left out** of these documents. They belong in private environment configuration (`SUPER_ADMIN_BOOTSTRAP`, payment settings), never in source control.
