---
name: rental-saas-ux
description: Design intuitive workflows and screen structures for a multi-tenant rental property management SaaS covering properties, units, tenants, leases, payments, maintenance, and documents.
metadata:
  domain: rental-property-management
  focus: ux
  stack: react-supabase
---

## Purpose

Use this skill to design or review product UX for rental operations software.

This skill optimizes for:
- fast task completion
- clarity of scope and context
- predictable navigation
- low-friction operational workflows
- safe handling of high-impact actions
- explicit empty, loading, error, and success states

## When to use

Use this skill when the request involves:
- designing a new feature
- improving an existing workflow
- dashboard planning
- onboarding
- forms
- lists, detail pages, edit flows
- user journey review
- reducing friction or confusion
- mobile usability decisions
- rental domain workflows involving properties, units, tenants, leases, payments, maintenance, or documents

## Product assumptions

- Multi-tenant B2B SaaS used by operational users.
- Users care more about speed, clarity, and reliability than novelty.
- Most workflows are repeated frequently and should become predictable over time.

## Universal UX rules

- Keep one primary action per major area whenever possible.
- Prefer list → detail → edit for operational records.
- Use progressive disclosure instead of crowding one screen.
- Keep context visible: workspace, property, unit, tenant, lease, payment period, or document relationship.
- Favor familiar SaaS patterns over creative interaction patterns.
- Separate routine actions from destructive actions.
- Treat loading, empty, error, no-permission, and success states as mandatory.

## Workflow method

When asked to design or review a feature:

1. Identify the user, goal, task frequency, and risk level.
2. Identify the primary entity and related entities.
3. Map the shortest happy path.
4. Identify critical edge cases and failure states.
5. Recommend the simplest screen structure that supports both first-time and repeat users.
6. Explain why the flow is intuitive.
7. Flag ambiguity, overload, or hidden risk.

## Domain-specific rules

### Properties and units
- Property context must remain visible when drilling into units, leases, maintenance, payments, or documents.
- Make property-level and unit-level actions visually distinct.
- Avoid screens where users could mistake a property-level action for a unit-level action.

### Tenants
- Tenant identity should be easy to verify at a glance.
- If multiple tenants relate to a lease or unit, show relationship structure clearly.
- Surface current status and key contact/useful next actions prominently.

### Leases
- Show lease lifecycle clearly using plain-language statuses.
- Always expose key dates: start, end, renewal, notice, and any rent-change effective dates if relevant.
- Make tenant ↔ lease ↔ unit relationships explicit.
- For renewals or edits, show current values before proposed changes.

### Payments
- Money, due dates, periods, and statuses must be unambiguous.
- Distinguish clearly between scheduled, due, paid, overdue, failed, partial, and refunded states if the product supports them.
- Prevent accidental duplicate entry or confusing payment actions.
- The dashboard should surface urgent payment issues before general analytics.

### Maintenance
- Optimize for triage, assignment, prioritization, and follow-up.
- Status, priority, assignee, due date, and property/unit context must be immediately scannable.
- Notes, attachments, and history should be easy to review.
- Avoid burying urgent maintenance status behind extra clicks.

### Documents
- Documents are high-trust artifacts.
- Always show document type, related entity, key dates, and status/recency.
- Prefer preview-before-destructive-action flows.
- Make scope explicit: property, unit, tenant, lease, or workspace-level.
- Clearly distinguish between draft, generated, uploaded, signed, archived, or equivalent states if supported.

## Dashboard rules

A dashboard should answer:
- what needs attention now
- what changed recently
- what is blocked
- what can be done next

Default dashboard priority:
1. urgent tasks or exceptions
2. operational KPIs
3. recent activity
4. work queues
5. secondary analytics

Do not turn dashboards into generic summary pages with no clear next action.

## Form rules

- Ask only for the information needed at that step.
- Use sections for longer forms.
- Prefer defaults and inferred values where safe.
- Validate inline where practical.
- Preserve input after validation or server errors.
- For high-impact changes, summarize what is changing before confirmation.

## Output format

Use this structure unless the user requests something else:

### User and goal
- user
- goal
- primary entity
- frequency
- risk

### Recommended flow
Numbered user steps.

### Screen structure
- page purpose
- key information
- primary action
- secondary actions
- states to support

### UX rationale
Bullets explaining why the flow is intuitive.

### Risks and edge cases
Bullets for ambiguity, data risk, or failure states.

### Implementation notes
Short notes for frontend engineers.

## Anti-patterns

- dashboards with no actionable priority
- multi-step critical workflows hidden in small modals
- ambiguous scope between property and unit
- lease pages that hide tenant or status context
- payment UIs with unclear billing period or state
- maintenance lists without priority/status clarity
- document views without related-entity context
- empty states with no next action

## RentMate-specific references

This project's `AGENTS.md` documents exact implementation patterns. The following table maps generic UX rules from this skill to concrete RentMate conventions:

| UX rule | RentMate equivalent |
|---|---|
| Empty states as mandatory | `<EmptyState>` component; never early-return — always render full layout chrome, empty state inside content area only |
| Context visibility | `PropertySwitcher`, `TenantSwitcher` keep context during drill-down; breadcrumbs skip UUID segments |
| Lease lifecycle clarity | `tenancy_status` trigger-derived from dates; `getTenancyDisplayLabel()` for human labels |
| Navigation predictability | Header icon nav + Sheet drawer (mobile); `PropertyHub` tabs pattern |
| Tenant ↔ lease ↔ unit relationship | `TenantSwitcher` filters active/ending_tenancy/historic; `ContactInfoCard` shows current status |
| Payment state clarity | `PaymentsTab` two-layer architecture; `UnifiedPaymentHistory` handles empty/no-tenant states |
| Destructive action safety | `ConfirmDeleteDialog` component; preview-before-destructive-action for documents via `PropertyDocumentUpload` |
| Wizard progressive disclosure | `CreateTenancyWizard` three-step; non-linear navigation; sessionStorage persistence |
| High-impact summary before confirm | Wizard review step shows all terms before Save |
