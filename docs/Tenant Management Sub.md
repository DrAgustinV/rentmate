# Tenant Management Sub-Scope Definition

## Overview
Three modules with consistent "Current / Next / Historic" navigation. Each module shares the same tenant status logic.

---

## Core Status Logic (Single Source of Truth)

### Fields

| Field | Purpose | Notes |
|-------|---------|-------|
| `start_date` | Contractual start date | Legal possession date |
| `end_date` | Contractual end date | NULL = ongoing |
| `possession_date` | Actual keys handover | Should equal `start_date` normally. If > `start_date` → flag as issue |
| `vacate_date` | Actual keys returned | NULL = still occupying. Should equal `end_date` ideally. If > `end_date` → create ticket for overstay |
| `grace_days` | Handover period | Default 60, overridable per tenant |


### Derived Statuses

| Status | Condition |
|--------|-----------|
| `pending` | `start_date > today` |
| `active (occupying)` | `start_date ≤ today` AND `vacate_date IS NULL` AND (`end_date IS NULL` OR `end_date > today`) |
| `active (leaving)` | `vacate_date IS NOT NULL` AND `vacate_date + grace_days ≥ today` |
| `ended` | `vacate_date IS NOT NULL` AND `vacate_date + grace_days < today` |

### Notes on possession_date
- **Not used in status calculation**
- Purpose: audit/comparison against `start_date` to detect unit unavailability issues
- If `possession_date > start_date` → flag for manual review (unit wasn't ready on time). 

BIG PICTURE REDESIGN:
- move /tenants tabs inside the /properties
- the new tab structure will be: overview - Tenants -- Payments -- Tickets 
- ../overview tab shoes property definition (no change)
- /properties/:propertyId/tenants tab shows /tenants?tab=contracts (change of navigation, no change within the the tab features nor UI)
- /properties/:propertyId/payments tab shows /tenants?tab=payments (change of navigation, no change within the the tab features nor UI)
- /properties/:propertyId/tickets tab shows /tenants?tab=tickets (change of navigation, no change within the the tab features nor UI)

## /properties tabs

### Property
- same as /properties/.../overview 



### Tenants
- **Edit button** only for `pending` and `active (occupying)` statuses
- Editable fields: name, contact details, rental agreement notes
- Legal binding data remains in contract (app is for friendly agreements only)
## - Filters: Type (All default) | Tenant Status (Active default)

### Payments
- Filters: Type (All default) | Payment Status (All default) | Tenant Status (Current default)
- Payment Status values: `paid`, `unpaid`, `partial`, `overdue`

### Tickets
- Filters: Type (All default) | Ticket Status (Open default) | Tenant Status (Current default)
- Ticket Status values: `open`, `in_progress`, `closed`
- **Rule:** Tickets can only be created for `pending`, `active (occupying)`, or `active (leaving)` tenancies

### Switch Pills (All three modules)
| Pill | Shows |
|------|-------|
| Current (default) | `active (occupying)` + `active (leaving)` |
| Next | `pending` |
| Historic | `ended` |

### "Current - All" Button
Shows all tenants regardless of status (override for the current pill filter)

---

## Key Business Rules

1. **Only one tenant can be `active (occupying)` per unit at any time**
2. **Turnover overlap is allowed** (old tenant = `active (leaving)`, new tenant = `active (occupying)`)
3. **Overstay detection:** If `vacate_date IS NULL` AND `end_date < today` → show warning banner, no status change
4. **Early vacate detection:** If `vacate_date < end_date` → allowed, no action needed

---

## Dev Notes

- Do not store `residency_status` — derive from `vacate_date IS NULL`
- `grace_days` default = 60, configurable via `/admin` AND overridable per tenant
- All date comparisons use UTC, compare at date granularity (ignore time)

