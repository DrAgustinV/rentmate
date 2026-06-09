---
name: rental-design-system
description: Enforce a calm, accessible, operations-friendly design system for a rental property SaaS with consistent forms, tables, states, hierarchy, and responsive behavior.
compatibility: opencode
license: MIT
metadata:
  domain: rental-property-management
  focus: ui-design-system
  stack: react-tailwind
---

## Purpose
Use this skill to keep the product UI consistent, readable, and operationally efficient.

This skill is for:
- component design
- visual consistency
- spacing and typography decisions
- table and form quality
- accessibility
- responsive behavior
- state design

## Design goals
The UI should feel:
- calm
- trustworthy
- efficient
- structured
- readable
- professional

Avoid flashy or novelty-driven UI choices.
Operational clarity is more important than expressiveness.

## When to use
Use this skill when:
- creating or updating components
- reviewing visual consistency
- defining reusable UI patterns
- standardizing table, form, card, badge, tab, or modal behavior
- improving accessibility
- making responsive design choices
- turning UX decisions into concrete UI patterns

## Core visual principles
- Use neutral surfaces and restrained accent colors.
- Build strong hierarchy through spacing, typography, and layout before adding extra decoration.
- Keep interactive elements visually distinct and consistently sized.
- Keep important metadata scannable without making screens noisy.
- Prioritize dense-but-readable operational layouts over airy marketing-style layouts.

## Typography rules
- Maintain a predictable type scale.
- Headings should clarify structure, not dominate the interface.
- Labels, helper text, table text, badges, and action labels must be consistent across similar screens.
- Use small text carefully; never let metadata become unreadable.
- Make money, dates, statuses, and key entity names easy to scan.

## Spacing rules
- Use a spacing system consistently.
- Similar cards, tables, filters, and forms should share spacing patterns.
- Use tighter density in operational screens only when readability remains strong.
- Prefer structural consistency over pixel-perfect one-off tweaks.

## Component rules

### Tables and lists
- Optimize for scanning.
- Put the most decision-relevant columns first.
- Row actions should be consistent across entities.
- Statuses should be readable without relying only on color.
- Filters and search should appear only where they improve real tasks.

### Forms
- Labels must be explicit.
- Group related fields.
- Use helper text where decisions happen.
- Validation should be visible and specific.
- Complex editing should use drawers or full pages when space is needed.

### Badges and status chips
- Use plain-language labels.
- Keep color semantics consistent across the app.
- Do not invent a new color mapping per feature.

### Cards and summary panels
- Use cards for summarizing, not for hiding critical detail.
- KPI cards should emphasize the value first, then context or trend.
- Avoid over-decorated cards with weak information hierarchy.

### Modals and drawers
- Use modals for focused confirmation or short edits.
- Use drawers or pages for medium/complex editing.
- Do not stack modal inside modal.

## Accessibility rules
- Ensure keyboard access for major interactions.
- Maintain visible focus states.
- Ensure contrast for body text, labels, helper text, and status indicators.
- Icon-only buttons must have accessible labels.
- Error messages must be textual, not color-only.
- Do not hide critical information in tooltip-only or hover-only interactions.

## Responsive rules
- Mobile should preserve core tasks, not just shrink desktop.
- Prioritize entity identity, status, and next action on small screens.
- Tables need an intentional mobile behavior: horizontal scroll, responsive columns, or card transforms.
- Keep key actions reachable.
- Avoid cramped forms and overly dense filter bars on mobile.

## Output behavior
When asked to generate or review UI, I should:
1. identify existing reusable patterns
2. normalize spacing, typography, and state handling
3. align new UI with existing primitives
4. flag inconsistency directly
5. propose variants instead of one-off styling

## Review checklist
For every screen/component, verify:
- hierarchy is clear
- entity identity is easy to see
- status is easy to see
- spacing matches neighboring patterns
- actions are ordered by importance
- empty/loading/error states exist
- keyboard/focus behavior is handled
- mobile behavior is intentional
- visual noise is controlled

## Anti-patterns
- decorative dashboards
- inconsistent button heights or paddings
- unreadable metadata
- too many badge colors
- tables overloaded with weak columns
- filters with unclear defaults
- important row actions hidden unpredictably
- low-contrast helper text
- cramped modal forms for high-impact edits
