---
name: rental-react-supabase
description: Build maintainable React, TypeScript, and Supabase features for a rental property SaaS with clear entity relationships, tenant scope, async states, and operational workflows.
compatibility: opencode
license: MIT
metadata:
  domain: rental-property-management
  focus: frontend-implementation
  stack: react-typescript-supabase
---

## Purpose
Use this skill when implementing or refactoring frontend code for the rental SaaS.

This skill optimizes for:
- maintainable React code
- explicit tenant-aware data flow
- clean feature boundaries
- predictable async behavior
- understandable TypeScript types
- safe operational UI

## When to use
Use this skill when:
- implementing new frontend features
- wiring UI to Supabase
- creating entity CRUD flows
- adding hooks, forms, tables, or filters
- refactoring large React components
- making tenant/workspace scoping explicit
- improving loading/error/empty state handling

## Domain model expectations
Assume core entities may include:
- workspace or tenant context
- properties
- units
- tenants
- leases
- payments
- maintenance requests
- documents
- activities or audit events

Keep entity relationships explicit in naming, types, and UI structure.

## Architecture rules
- Prefer feature-oriented folders over flat technical dumping grounds.
- Keep domain logic out of purely presentational components.
- Separate fetching/mutation concerns from presentational rendering when complexity grows.
- Reuse existing UI primitives and feature patterns before inventing new abstractions.
- Avoid giant components that fetch, transform, mutate, and render everything.

## Naming rules
- Use explicit names tied to the domain.
- Prefer `leaseStatus`, `paymentPeriod`, `maintenancePriority`, `documentScope`, `propertyId`, `unitId`, `workspaceId`.
- Avoid vague names like `item`, `data`, `info`, or `record` when the entity is known.

## Supabase rules
- Always make workspace or tenant scope explicit in query logic.
- Assume row-level security and partial visibility.
- Handle null, empty, filtered, and permission-limited results safely.
- Centralize auth/session-aware behavior.
- For writes, define success and failure behavior clearly.
- Do not silently swallow Supabase errors.

## React rules

### Components
- Keep components focused and composable.
- Split smart/container logic from visual components when complexity justifies it.
- Prefer explicit props over magic hidden dependencies.
- Make entity identity and scope visible in the render tree.

### Hooks
Use custom hooks for:
- list queries
- detail queries
- mutations
- filters/sorting/pagination
- workspace context
- feature-specific derived state

Hook names should be concrete and entity-based.

### State
- Keep local UI state local.
- Keep feature state close to the feature.
- Use shared context only when the concern is truly shared.
- Make loading, submitting, refreshing, and error states explicit.

## Forms
- Keep schemas and validation near the form.
- Use explicit default values.
- Preserve values after submit failure.
- Map backend errors to readable UI messages.
- For risky changes, support review/confirmation where appropriate.

## Entity-specific implementation guidance

### Properties and units
- Keep property and unit data boundaries clear in code and UI.
- Do not mix property and unit identifiers casually.
- Surface current parent context in headers or breadcrumbs.

### Tenants and leases
- Keep tenant and lease relationships explicit in types and queries.
- Model statuses clearly and avoid ad hoc string handling spread across the app.
- Date logic should be centralized when lease lifecycle rules become complex.

### Payments
- Represent billing period, amount, due date, paid date, and status clearly.
- Avoid duplicate write paths that can create inconsistent payment records.
- Financial operations should have explicit success/failure feedback.

### Maintenance
- Keep status, priority, assignment, and timeline/history easy to follow in both data and UI.
- Support quick updates without hiding critical fields.

### Documents
- Keep related-entity scope explicit in types and UI.
- Distinguish upload state, generation state, signing state, and archival state if applicable.
- Destructive operations should be guarded and clearly labeled.

## Output behavior
When implementing a feature, usually provide:
1. feature breakdown
2. component and hook plan
3. TypeScript types
4. data flow notes
5. implementation code
6. loading/error/empty/success state handling
7. risks or follow-up refactors only when justified

## Review checklist
Before finalizing code, verify:
- workspace/tenant scope is explicit
- entity relationships are explicit
- loading/error/empty states exist
- destructive actions are guarded
- form validation is clear
- naming is domain-specific
- component boundaries are reasonable
- repeated query logic is not spreading unnecessarily

## Anti-patterns
- giant domain-agnostic CRUD helpers too early
- hidden workspace scope
- vague naming
- silent async failures
- generic "something went wrong" everywhere
- component files that mix all concerns
- duplicate payment mutation logic
- document actions without scope/context checks
