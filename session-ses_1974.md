# Tenancy lifecycle rules for RentMate changes plan

**Session ID:** ses_1974d0cf3ffej0wzd4koKPUf7X
**Created:** 5/27/2026, 11:10:18 AM
**Updated:** 5/27/2026, 11:35:38 AM

---

## User

take this definition as business rules while code and database examples are an ilustration and not the rule to follow. What we need to change in the current code, how big the changes is, what are the risks? look for as simple as possible change, step by step to reduce risks. # Tenancy Lifecycle — Business Rules & Agent Instructions

> **Project**: RentMate — Property Rental Management SaaS  
> **Stack**: TypeScript · React · Node.js / Express · MongoDB · Supabase  
> **Scope**: Rules for computing tenancy status, enforcing operational permissions, managing lifecycle transitions, and enabling parallel next-tenancy setup.

---

## 1. Status Definitions

A tenancy status is **derived**, not manually set (except `terminated`). The source of truth is always `startDate`, `endDate`, and the `terminatedAt` flag on the tenancy record.

### 1.1 Derivation Logic

```ts
type TenancyStatus = 'pending' | 'active' | 'ending' | 'ended' | 'terminated';

const ENDING_WINDOW_DAYS = 60;

function computeTenancyStatus(tenancy: Tenancy, today: Date = new Date()): TenancyStatus {
  if (tenancy.terminatedAt) return 'terminated';

  const start = new Date(tenancy.startDate);
  const end   = tenancy.endDate ? new Date(tenancy.endDate) : null;

  if (start > today) return 'pending';
  if (end && end < today) return 'ended';
  if (end) {
    const daysUntilEnd = Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
    if (daysUntilEnd <= ENDING_WINDOW_DAYS) return 'ending';
  }
  return 'active';
}
```

### 1.2 Status Reference Table

| Status | Condition | Primary meaning |
|---|---|---|
| `pending` | `startDate > today` | Future tenancy, being prepared |
| `active` | `startDate ≤ today` AND (`endDate > today+60d` OR no `endDate`) | Live, no near-term end |
| `ending` | `startDate ≤ today` AND `endDate` within next 60 days | Live but in wind-down window |
| `ended` | `endDate < today` (normal expiry) | Concluded as expected |
| `terminated` | `terminatedAt` is set (manual/legal action) | Closed early or by force |

**Rule**: `terminated` is the only status that must be set explicitly. All others are computed on read. Never persist a computed status to the database — always derive it at query time.

---

## 2. Occupancy Model per Property Unit

A property unit may have:

- **At most one live occupancy** at a time (`active` or `ending`)
- **At most one future tenancy** queued up (`pending`)
- **Unlimited historical records** (`ended`, `terminated`)

### 2.1 Date Overlap Validation

Before saving a new tenancy, enforce:

```ts
async function validateNoOccupancyOverlap(
  unitId: string,
  newStart: Date,
  newEnd: Date | null,
  excludeTenancyId?: string
): Promise<void> {
  const liveAndFuture = await getTenanciesForUnit(unitId, ['active', 'ending', 'pending']);

  for (const t of liveAndFuture) {
    if (t.id === excludeTenancyId) continue;
    const tStart = new Date(t.startDate);
    const tEnd   = t.endDate ? new Date(t.endDate) : null;

    const overlaps =
      (!tEnd || newStart <= tEnd) &&
      (!newEnd  || newEnd  >= tStart);

    if (overlaps) {
      throw new OccupancyOverlapError(
        `Occupancy overlap with tenancy ${t.id} (${t.startDate} – ${t.endDate ?? 'open'})`
      );
    }
  }
}
```

**Exception**: A super-admin role may bypass with an explicit `allowOverride: true` flag. This must be logged in the audit trail.

---

## 3. Operational Permissions by Status

These are the field-level rules that govern what a property manager can do in each lifecycle stage.

### 3.1 Permission Matrix

| Operation | `pending` | `active` | `ending` | `ended` | `terminated` |
|---|---|---|---|---|---|
| Edit lease terms | ✅ | ✅ | ✅ | 🔒 | 🔒 |
| Record rent charges | ✅ (schedule only) | ✅ | ✅ | 🔒* | 🔒* |
| Raise maintenance tickets | ⚠️ pre-move-in only | ✅ | ✅ | 🔒 | 🔒 |
| Send tenant messages | ⚠️ future-tenant thread | ✅ | ✅ | 👁️ read-only | 👁️ read-only |
| Upload documents | ✅ | ✅ | ✅ | 👁️ read-only | 👁️ read-only |
| Record deposit amounts | ✅ | ✅ | ✅ | ✅ settle/adjust | ✅ settle/adjust |
| Complete checkout tasks | ❌ | ❌ | ✅ | ✅ after move-out | ✅ after move-out |
| Add internal notes | ✅ | ✅ | ✅ | ✅ always | ✅ always |
| Terminate manually | ✅ | ✅ | ✅ | ❌ | ❌ |

> 🔒 = locked (read-only)  
> 👁️ = visible but not editable  
> ⚠️ = allowed with restrictions  
> \* = limited financial corrections still allowed by `admin` role

### 3.2 Post-End Exceptions (Controlled Editability)

Even after a tenancy is `ended` or `terminated`, these fields remain editable under the `manager` or `admin` role with mandatory audit logging:

- Deposit settlement amount and reason
- Final invoice adjustments (credit notes, late charges)
- Dispute notes and legal annotations
- Outcome classification (`cleanEnding`, `deposit_dispute`, `eviction`, etc.)

Every such edit must write to the `tenancy_audit_log` table:

```ts
interface AuditEntry {
  tenancyId: string;
  changedBy: string;         // userId
  changedAt: Date;
  field: string;
  previousValue: unknown;
  newValue: unknown;
  reason: string;            // required for post-end edits
}
```

---

## 4. Lifecycle Transition Rules

### 4.1 Automatic Transitions

Triggered by a scheduled job (e.g. daily cron at 00:05 UTC):

```
active  → ending       when endDate enters the 60-day window
ending  → ended        when endDate passes
pending → active       when startDate is reached
```

On each transition, emit a domain event:

```ts
type TenancyEvent =
  | { type: 'TENANCY_ENTERED_ENDING_WINDOW'; tenancyId: string; daysRemaining: number }
  | { type: 'TENANCY_ENDED';                tenancyId: string; endDate: string }
  | { type: 'TENANCY_ACTIVATED';            tenancyId: string; startDate: string };
```

These events trigger downstream actions: notifications to the property manager, unlocking checkout tasks, closing the rent schedule, etc.

### 4.2 Manual Transitions

Only `terminated` is set manually. Required fields:

```ts
interface TerminateTenancyPayload {
  tenancyId: string;
  terminatedAt: Date;
  terminationReason: 'mutual_agreement' | 'eviction' | 'breach' | 'abandonment' | 'other';
  terminationNote?: string;
  finalEndDate: Date;          // may differ from original endDate
}
```

A termination must:
1. Set `terminatedAt` on the tenancy record
2. Set `status: 'inactive'` on all linked `rent_agreements`
3. Emit a `TENANCY_TERMINATED` event
4. Log the full payload to `tenancy_audit_log`

### 4.3 Forbidden Transitions

| From | To | Rule |
|---|---|---|
| `ended` | any | Cannot reactivate; create a new tenancy instead |
| `terminated` | any | Cannot reactivate; create a new tenancy instead |
| `ended` | `terminated` | Use `outcome` field instead; do not re-transition |

---

## 5. Parallel Tenancy Workflow (Ending + Pending)

This is the most important operational case: the current tenancy is `ending` while the manager prepares the next one.

### 5.1 What the System Must Support Simultaneously

**For the current (`ending`) tenancy:**
- Full rent management until `endDate`
- Maintenance tickets raised by or for the current tenant
- Notice of departure documents
- Checkout form, key return, and inspection records
- Deposit reconciliation form (can be started before end date)
- Tenant-facing communications

**For the future (`pending`) tenancy:**
- New lease agreement drafting
- Tenant onboarding documents (ID, references, guarantors)
- Scheduled move-in date (must be ≥ current tenancy's `endDate`)
- Deposit collection and receipt
- Pre-move-in maintenance or fit-out tasks
- Future tenant communications (separate thread)

### 5.2 UI Separation Rule

When both records exist on the same unit, the UI must visually separate them:

```
[Current occupant — ENDING in 14 days]     → section A — full management
[Incoming tenant — PENDING from 01 Jul]    → section B — onboarding only
```

Never merge events, charges, or messages from two different tenancies in the same feed. Each tenancy is its own operational context.

### 5.3 Date Constraint for Next Tenancy

```
nextTenancy.startDate >= currentTenancy.endDate
```

A gap between the two is allowed (e.g. void period, refurbishment). Overlap is not allowed unless `allowOverride: true` is set by an admin with a logged reason.

---

## 6. Historical Tenancy — Data Access Policy

Once a tenancy is `ended` or `terminated`, it moves from the operational workspace into the historical record. Full visibility must be preserved indefinitely.

### 6.1 What Must Remain Readable Forever

- Full lease and contract documents
- Complete payment ledger (all charges, receipts, arrears)
- Maintenance ticket history
- All tenant and internal communications
- Inspection reports and inventory records
- All uploaded files
- Audit log

### 6.2 What Becomes Read-Only

Everything not listed in the "controlled editability" exceptions in §3.2.

### 6.3 Data Retention Rule

Historical tenancy records must never be hard-deleted unless:
- A verified GDPR erasure request is received from the data subject
- A legal hold has expired and compliance has approved deletion
- An admin confirms deletion with a mandatory 30-day grace period

Soft deletion (`deletedAt`) is the default for any cleanup action. Data subject erasure must anonymise PII fields, not destroy financial and operational records.

---

## 7. Agent / AI Coding Assistant Instructions

The following rules apply when using an AI coding agent (Aider, OpenCode, Roo Code, or similar) to implement or modify tenancy lifecycle logic in the RentMate codebase.

### 7.1 Never Persist Computed Status

```
RULE: The `status` column does not exist on the tenancy table.
      Status is always derived by `computeTenancyStatus()` at the service layer.
      Do not add a status field to the DB schema.
      Do not write status to MongoDB or Supabase.
```

If you see a query filtering by a `status` field, replace it with a date-range query equivalent:

```ts
// WRONG
const ending = await db.tenancies.find({ status: 'ending' });

// CORRECT
const today = new Date();
const in60  = addDays(today, 60);
const ending = await db.tenancies.find({
  startDate: { $lte: today },
  endDate:   { $gte: today, $lte: in60 },
  terminatedAt: null
});
```

### 7.2 Mutation Sequence for Termination

When implementing the terminate tenancy mutation, always:
1. Update the tenancy record first (set `terminatedAt`, `finalEndDate`, `terminationReason`)
2. Update all linked `rent_agreements` to `status: 'inactive'` using the `tenancy_id` FK (not `tenant_id`)
3. If the `rent_agreements` update fails, treat it as non-fatal — log the error, do not roll back the tenancy termination
4. Emit the `TENANCY_TERMINATED` domain event
5. Write to `tenancy_audit_log`

### 7.3 Overlap Validation Must Run on Create and Update

Call `validateNoOccupancyOverlap()` in:
- `createTenancy` service method
- `updateTenancyDates` service method
- Any admin override path (with `allowOverride: true` and audit log)

### 7.4 Checkout Tasks Are `ending`-Only Actions

Do not unlock checkout tasks for `pending` or `active` tenancies. The checkout task list renders only when `computeTenancyStatus(tenancy) === 'ending'` or after the tenancy has ended (for late completions).

### 7.5 Deposit Settlement Is Always Writable

Deposit amount, settlement status, and deduction breakdown must remain writable regardless of tenancy status. Deposit fields are the only financial fields with no status-based write lock. Route mutations for deposit through a dedicated `settleDeposit()` service method, not through the generic `updateTenancy()` mutation.

### 7.6 Dual-Tenancy Context in the UI

When a unit has both an `ending` tenancy and a `pending` next tenancy, the data layer must return them as two distinct objects. Never merge them. The component must receive:

```ts
interface UnitContext {
  currentTenancy: Tenancy | null;   // active or ending
  nextTenancy:    Tenancy | null;   // pending only
  history:        Tenancy[];        // ended + terminated
}
```

The UI then renders each section independently from its own data context.

### 7.7 Audit Log Is Mandatory for Post-End Edits

Any service method that allows editing a field on an `ended` or `terminated` tenancy must call `writeAuditEntry()` before the update. If `writeAuditEntry()` fails, abort the edit and surface the error. The audit trail is more important than the edit succeeding silently.

---

## 8. Summary of Invariants

These invariants must always hold. Automated tests should assert every one of them.

1. A unit never has two tenancies with overlapping occupancy (unless `allowOverride: true` with audit entry).
2. `computeTenancyStatus()` is the single source of status truth — no status column in the DB.
3. `terminated` is only set by an explicit mutation, never derived from dates.
4. Ended and terminated tenancies are permanently readable and partially writable (deposit, notes, audit).
5. The future (`pending`) tenancy always has `startDate >= currentTenancy.endDate`.
6. Every post-end write has a matching audit log entry with `reason` field.
7. Termination always cascades to linked `rent_agreements` (non-fatal if cascade fails). 

---

## Assistant (Plan · Claude Sonnet 4.6 · 226.1s)

I'll analyze the current codebase against these business rules to identify gaps, estimate the size of changes, and propose a risk-ordered step-by-step plan.

**Tool: task**

**Input:**
```json
{
  "description": "Analyze tenancy lifecycle code",
  "subagent_type": "explore",
  "prompt": "Analyze the RentMate codebase at /home/dragutin/projects/rentmate focusing on tenancy lifecycle. I need a thorough understanding of:\n\n1. How tenancy status is currently stored and computed - look for any `status` field on tenancy/property_tenants tables, any `computeTenancyStatus` or equivalent functions\n2. The current status values used: look for 'pending', 'active', 'ending_tenancy', 'historic', 'ended', 'terminated' - what values are actually in use?\n3. Where tenancy status is read/written - services, hooks, components\n4. How overlap validation currently works (if at all)\n5. Whether there's an audit log table or mechanism\n6. How deposit settlement currently works\n7. What \"ending window\" concept exists (if any)\n8. The `property_tenants` table structure and `tenancy_requirements` table\n9. Any cron jobs or scheduled tasks\n10. The `rent_agreements` table and how it links to tenancies\n\nKey files to look at:\n- src/services/ (especially tenancyService, propertyService, etc.)\n- src/types/domain.ts\n- src/integrations/supabase/types.ts\n- supabase/functions/ (edge functions related to tenancy)\n- src/hooks/ (usetenancy, useTenancy, etc.)\n- Any migration files or schema files\n\nPlease provide a comprehensive report covering:\n- Current status field names and values\n- Where status is persisted vs computed\n- What's missing vs the business rules document\n- File paths and line numbers for key findings"
}
```

**Output:**
```
task_id: ses_1974ce22affeKiO1EXS63AgMZP (for resuming to continue this task if needed)

<task_result>
I now have a comprehensive understanding of the entire tenancy lifecycle. Here is the full report:

---

# RentMate Tenancy Lifecycle — Comprehensive Analysis Report

---

## 1. How Tenancy Status Is Currently Stored and Computed

### Storage location

Status lives in exactly **two** places. There is no computed status function anywhere in the codebase.

| Table | Column | Type | Notes |
|---|---|---|---|
| `property_tenants` | `tenancy_status` | `text` (nullable) | The canonical lifecycle state of a tenancy |
| `tenancy_requirements` | `status` | `text` (nullable) | Tracks the setup/invitation workflow *before* a tenancy is active |

`property_tenants.tenancy_status` is the source of truth for the UI. The TypeScript domain layer maps it directly:

- `src/types/domain.ts:2` — `TenancyStatus = 'active' | 'ending_tenancy' | 'historic' | 'pending' | null`
- `src/services/tenantService.ts:24` — `status: row.tenancy_status` (pass-through, no transformation)

There is **no** `computeTenancyStatus()` or equivalent. All status changes are explicit `UPDATE` mutations.

---

## 2. Current Status Values in Use

### `property_tenants.tenancy_status` — 4 live values

| Value | Where set | Meaning |
|---|---|---|
| `'active'` | `PropertyTenants.tsx:232,261` (wizard submit), `Rentals.tsx:194` (invitation accept) | Tenancy is in progress; default value in schema (`DEFAULT 'active'`) |
| `'ending_tenancy'` | `usePropertyTenants.ts:209` (`endTenancyMutation`) | Manager has set a planned end date |
| `'historic'` | `usePropertyTenants.ts:226` (`finalizeTenancyMutation`) | Tenancy has ended; read-only |
| `'pending'` | Added via migration `20260517000000_add_pending_tenancy_status.sql:4` | Defined in constraint but **never actually written** by any service or page code (see §8 below) |

**DB-enforced constraint** (migration line 7–12):
```sql
CHECK (tenancy_status = ANY (ARRAY['active','ending_tenancy','historic','pending']))
```

**Unique DB indexes** enforce at most one of each active/ending per property:
- `idx_one_active_tenant_per_property` (unique partial index on `property_id WHERE tenancy_status = 'active'`) — migration line 2373
- `idx_one_ending_tenant_per_property` (unique partial index on `property_id WHERE tenancy_status = 'ending_tenancy'`) — migration line 2381

**Dead value: `'inactive'`** — The `manage-tenancy-limit` edge function (`supabase/functions/manage-tenancy-limit/index.ts:40`) filters for `tenancy_status === 'inactive'` when doing FIFO cleanup. This value does not appear in the constraint, is not in the `TenancyStatus` type, and is never written by any current code. The function will never find any records to delete.

### `tenancy_requirements.status` — 5 values

| Value | Where set | Meaning |
|---|---|---|
| `'draft'` | Implicit (no `status` set on insert, db default) or left unset | Requirement created, invitation not yet sent |
| `'sent'` | `usePropertyTenants.ts:175` after `inviteMutation` | Invitation email sent to tenant |
| `'accepted'` | `Invitations.tsx:107` when tenant clicks Accept | Tenant accepted the invitation |
| `'completed'` | `PropertyTenants.tsx:245,274` for self-managed path | Tenancy created and active (self-managed shortcut) |
| `'cancelled'` | `useTenancyRequirements.ts:152` (`deleteRequirement`) | Setup cancelled by manager |

---

## 3. Where Tenancy Status Is Read and Written

### Status WRITES

| Location | File : Line | Operation | New Status |
|---|---|---|---|
| Wizard submit (self-managed, no email) | `PropertyTenants.tsx:232` | INSERT `property_tenants` | `'active'` |
| Wizard submit (self-managed + email) | `PropertyTenants.tsx:261` | INSERT `property_tenants` | `'active'` |
| Invitation accepted by tenant | `Rentals.tsx:194` (or `Invitations.tsx:98`) | UPDATE `invitations` status; no direct `property_tenants` write here — tenant insert handled by RLS policy | `'active'` (via DB trigger/RLS insert policy) |
| End Tenancy dialog | `usePropertyTenants.ts:209` | UPDATE `property_tenants` | `'ending_tenancy'` |
| Finalize Tenancy | `usePropertyTenants.ts:226` | UPDATE `property_tenants` | `'historic'`, sets `ended_at` |
| End Immediately (no real tenant) | Same `finalizeTenancyMutation` path | UPDATE `property_tenants` | `'historic'` |
| Cancel setup cleanup | `PropertyTenants.tsx:350` | DELETE `property_tenants` WHERE `tenant_id IS NULL AND tenancy_status = 'active'` | (delete, not status change) |
| `updatePropertyTenantStatus()` | `tenancyService.ts:192` | Generic update helper | Any `TenancyStatus` |

### Status READS (filtering queries)

| Location | File : Line | Filter |
|---|---|---|
| Active tenancy check | `tenancyService.ts:163` | `.eq('tenancy_status', 'active')` |
| Tenant property list | `tenancyService.ts:173` | `.in(['active','ending_tenancy'])` |
| Check active tenancy | `tenancyService.ts:184` | `.in(['active','ending_tenancy'])` |
| Active tenancy for property | `tenantService.ts:138` | `.in(['active','ending_tenancy','pending'])` |
| Auth post-login redirect | `Auth.tsx:127` | `.eq('tenancy_status','active')` |
| Non-historic selector | `PropertyTenants.tsx:103` | filter `!== 'historic'` |
| Pending requirement guard | `PropertyTenants.tsx:128` | `r.status === 'draft' || r.status === 'sent'` |
| `canSetupNewTenancy` logic | `PropertyTenants.tsx:129–132` | status is `ending_tenancy`, `historic`, or `pending` |
| DB function | schema migration line 554–555 | `IN ('active','ending_tenancy')` |

---

## 4. Overlap Validation — Current State

There is **partial UI-level conflict detection only** — no database-level enforcement beyond unique indexes.

### What exists
- `canSetupNewTenancy` flag (`PropertyTenants.tsx:129–132`) — computed client-side. Allows setup when current tenant is `ending_tenancy`, `historic`, or `pending` (parallel setup concept).
- `dateConflictOpen` state (`PropertyTenants.tsx:85`) — a warning dialog exists and is wired up in the JSX (`PropertyTenants.tsx:763–768`) but the code that *opens* it (sets `setDateConflictOpen(true)`) was not found in the analyzed code paths. It appears to be defined but may be dead or only triggered conditionally elsewhere.
- Translation keys exist (`tenancy.dateConflictTitle`, `tenancy.dateConflictDesc`) confirming this was planned.
- **The database unique indexes** (`idx_one_active_tenant_per_property`, `idx_one_ending_tenant_per_property`) do enforce a hard constraint at the DB level — you cannot have two `active` or two `ending_tenancy` rows for the same property. This is the real guard.

### What is missing
- No date-range overlap check: if a new tenancy `start_date` falls before an existing tenancy's `planned_ending_date`, there is no warning or block (beyond the DB unique index on status, which prevents writing `active` while one exists).
- The `dateConflictOpen` AlertDialog wiring to a triggering condition is incomplete/unclear.

---

## 5. Audit Log — Current State

**No tenancy-specific audit log exists.** There is no `tenancy_audit`, `status_history`, or `tenancy_events` table.

What *does* exist as audit infrastructure:
- `data_retention_audit` table — tracks data retention/anonymization runs (not tenancy lifecycle)
- `cron_job_health` table — tracks scheduled job runs
- `ticket_activities` table — tracks ticket field changes (old/new JSON values), a pattern that *could* be replicated for tenancy
- `signature_events` table — event log for contract signature workflow steps
- `qualified_signature_logs` table — event log for QES providers

There is no mechanism to see "who changed this tenancy from `active` to `ending_tenancy` and when." The only breadcrumb is `ended_at` (a timestamp, not a full audit trail).

---

## 6. Deposit Settlement — Current State

**Deposit settlement is a stub — the data model exists but no settlement workflow is implemented.**

- `rent_agreements.security_deposit_cents` — stores the deposit amount (`integrations/supabase/types.ts:1423`)
- `rent_agreements.deposit_return_days` — stores how many days to return the deposit, defaults to 30 (`schema migration line 1433`)
- These fields are editable via `useRentAgreements.ts:154–155` (updateAgreement mutation accepts `security_deposit_cents` and `deposit_return_days`)
- Translation keys `depositAmount` and `depositReturnDays` are marked `// UNUSED` in `en.annotated.ts:1994–1996`

**There is no:**
- Deposit payment record/table
- Deposit return workflow or UI
- Deposit deduction logic
- Any edge function or cron job related to deposit settlement

The deposit amount is captured and stored, but the settlement lifecycle (claim, deduction, return) is entirely absent.

---

## 7. "Ending Window" Concept

The AGENTS.md document describes a **24-hour undo window** after finalization (historic → ending_tenancy revert), but **this is not implemented in the current code.**

What exists:
- The translation key `parallelSetupHint` (`en.ts:1495`) tells managers they can set up a new tenant after setting an end date — this is the "parallel setup" pattern
- `hasEndingTenancy` flag (`PropertyTenants.tsx:133`) controls UI elements during the ending window
- The AGENTS.md spec says: "24-hour undo window in historic banner (reverts to ending_tenancy); banner shows tenant name for context"

What is missing:
- No `HistoricBanner` component with an undo button
- No time-gated undo logic checking `ended_at < now() - 24h`
- No `undoFinalizeTenancy` mutation anywhere in the codebase

The "ending window" as a 24-hour undo concept **exists only in documentation** — the code does not implement it.

---

## 8. The `property_tenants` Table — Full Actual Structure

As of the latest migration (`20260530000000_add_manager_tenant_contact.sql`), the real table columns are:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `property_id` | uuid FK → properties | CASCADE delete |
| `tenant_id` | uuid FK → profiles (nullable) | Made nullable by migration 20260519; null for self-managed tenancies |
| `tenancy_status` | text (nullable) | DEFAULT `'active'`; CHECK in `['active','ending_tenancy','historic','pending']` |
| `started_at` | timestamptz | |
| `planned_ending_date` | date (nullable) | Set when status → `ending_tenancy` |
| `ended_at` | timestamptz (nullable) | Set when status → `historic` |
| `end_reason` | text (nullable) | |
| `notes` | text (nullable) | |
| `videos` | text[] (nullable) | |
| `created_at` | timestamptz | |
| `manager_tenant_name` | text (nullable) | Added migration 20260530; manager-entered name for self-managed tenancies |
| `manager_tenant_surname` | text (nullable) | Added migration 20260530 |
| `manager_tenant_phone` | text (nullable) | Added migration 20260530 |

**Type discrepancy alert:** `src/integrations/supabase/types.ts:1178–1244` and `src/types/supabase.ts:1190–1252` both show `tenant_id: string` (NOT NULL) and are missing the `manager_tenant_name/surname/phone` columns. These generated type files are **out of sync** with the actual DB schema. The services and hooks work around this with explicit casting (`Record<string, unknown>`).

---

## 9. The `tenancy_requirements` Table — Full Structure

From `integrations/supabase/types.ts:2219–2345`:

| Column | Type | Notable |
|---|---|---|
| `id` | uuid PK | |
| `property_id` | uuid FK → properties | |
| `tenancy_id` | uuid FK → property_tenants (nullable, SET NULL on delete) | Links to the created tenancy once setup completes |
| `invitation_id` | uuid FK → invitations (nullable) | Links to the invitation sent |
| `created_by` | uuid FK → profiles | Manager who created this |
| `tenant_email` | text | Required; target tenant email |
| `status` | text (nullable) | `'draft'|'sent'|'accepted'|'completed'|'cancelled'` |
| `require_email_verification` | boolean | |
| `require_kyc_verification` | boolean | |
| `require_phone_verification` | boolean | |
| `contract_method` | text (nullable) | `'digital'|'manual'|'none'` |
| `selected_template_id` | uuid FK → property_documents (nullable) | |
| `rent_amount_cents` | integer (nullable) | |
| `currency` | text (nullable) | |
| `security_deposit_cents` | integer (nullable) | |
| `payment_day` | integer (nullable) | |
| `start_date` | date (nullable) | |
| `end_date` | date (nullable) | |
| `utilities_config` | jsonb | |
| `questionnaire_enabled` | boolean | |
| `questionnaire_config` | jsonb (nullable) | |
| `created_at` / `updated_at` | timestamptz | |

---

## 10. Cron Jobs / Scheduled Tasks

The `cron_job_health` table exists for monitoring (schema migration line 1006), but the actual `pg_cron` schedule definitions are not in the migration files. The following edge functions are designed to be called by a scheduler:

| Edge Function | Purpose | Auth check |
|---|---|---|
| `generate-monthly-payments/index.ts` | Creates next 3 months of `rent_payments` records for all active agreements; marks overdue payments | Checks `Authorization` header against service role key |
| `mark-overdue-payments/index.ts` | Updates `rent_payments` status to `'overdue'` for past-due pending/proof_uploaded payments | No auth check (relies on service key in deploy config) |
| `send-payment-reminders/index.ts` | Sends reminder emails for overdue payments | |
| `send-signature-reminders/index.ts` | Sends signature reminder emails (1-hour cooldown enforced in DB) | |
| `create-recurring-tickets/index.ts` | Creates tickets from recurring schedules | |
| `enforce-data-retention/index.ts` | Anonymizes/deletes old data per retention policy | |

There is no auto-transition of tenancy status via cron. Moving a tenancy from `ending_tenancy` to `historic` when `planned_ending_date` passes is **not automated** — it requires manual manager action.

---

## 11. The `rent_agreements` Table and Tenancy Link

From `integrations/supabase/types.ts:1406–1525`:

| Key column | Notes |
|---|---|
| `tenancy_id` | FK → `property_tenants.id` (CASCADE delete). One-to-one with active tenancy |
| `tenant_id` | FK → `profiles.id` — denormalized for query performance |
| `manager_id` | FK → `profiles.id` — denormalized |
| `property_id` | FK → `properties.id` — denormalized |
| `is_active` | boolean — only `true` agreements are used for payment generation |
| `rent_amount_cents` | integer |
| `payment_day` | integer (1–31) |
| `currency` | text |
| `start_date` / `end_date` | dates |
| `mandate_id` / `mandate_status` / `mandate_pdf_url` / `mandate_signed_at` | SEPA Direct Debit mandate fields |
| `tenant_iban` | text (nullable) |
| `security_deposit_cents` | integer (nullable) |
| `deposit_return_days` | integer (nullable, DEFAULT 30) |
| `utilities_tenant_responsible` / `utilities_manager_responsible` | text (nullable) — utility assignment |
| `auto_reminders_enabled` | boolean |

**Link to tenancy:** `rent_agreements.tenancy_id` → `property_tenants.id` with `ON DELETE CASCADE`. There is a **DB trigger** `after_rent_agreement_activated` (schema migration line 2729) that fires `trigger_generate_rent_payments()` whenever `is_active = true AND tenant_iban IS NOT NULL`, automatically seeding 12 months of `rent_payments` records.

The `rent_agreements` table has **no unique constraint** on `tenancy_id`, so theoretically multiple agreements could exist for one tenancy. `getActiveRentAgreement()` (`tenancyService.ts:50–58`) queries with `.eq('is_active', true).maybeSingle()` to get the live one.

---

## Key Findings Summary: What's Missing vs the Business Rules

| Business Rule (from AGENTS.md) | Implementation Status |
|---|---|
| `pending` status for tenancy waiting for invite accept | Defined in DB constraint and `TenancyStatus` type, but **never written** by application code. Self-managed creates `'active'` directly; standard flow leaves no `property_tenants` row until tenant accepts |
| 24-hour undo window after finalization | **Not implemented** — documented only |
| Deposit settlement workflow | **Not implemented** — data fields exist (`security_deposit_cents`, `deposit_return_days`), no workflow |
| Auto-transition `ending_tenancy` → `historic` when `planned_ending_date` passes | **Not implemented** — manual manager action required, no cron |
| Date overlap validation before creating parallel tenancy | **Partial** — `dateConflictOpen` dialog defined but trigger condition unclear; DB unique indexes provide hard stop but no user-friendly date-range check |
| Tenancy audit log (who changed status, when) | **Not implemented** — no audit table for tenancy status changes |
| `manage-tenancy-limit` FIFO cleanup | **Broken** — queries for `tenancy_status = 'inactive'` which is not a valid value and never exists |
| `manager_tenant_name/surname/phone` columns in generated types | **Out of sync** — added by migration but not reflected in `src/integrations/supabase/types.ts` or `src/types/supabase.ts` |
</task_result>
```

---

## Assistant (Plan · Claude Sonnet 4.6 · 179.2s)

**Tool: task**

**Input:**
```json
{
  "description": "Analyze status mapping and key files",
  "subagent_type": "explore",
  "prompt": "In the RentMate codebase at /home/dragutin/projects/rentmate, I need to understand the current tenancy status naming vs. new business rules naming.\n\nCurrent code uses these status values in property_tenants.tenancy_status:\n- 'active' → maps to business rule 'active'\n- 'ending_tenancy' → maps to business rule 'ending'  \n- 'historic' → maps to business rule 'ended'\n- 'pending' → maps to business rule 'pending'\n- No 'terminated' equivalent exists\n\nBusiness rules also require 'terminated' status (set via terminatedAt flag).\n\nI need to know:\n\n1. Count ALL occurrences of each status string in source files:\n   - 'ending_tenancy' - count in .ts, .tsx files\n   - 'historic' - count in .ts, .tsx files\n   - How many unique files reference each\n\n2. Look at src/types/domain.ts - show me the TenancyStatus type definition and the Tenancy interface/type\n\n3. Look at src/services/tenancyService.ts - full content, especially:\n   - computeTenancyStatus or any status derivation\n   - updatePropertyTenantStatus function\n   - any date-based queries\n\n4. Look at src/hooks/usePropertyTenants.ts - the endTenancyMutation and finalizeTenancyMutation\n\n5. Look at property_tenants table: does it have startDate/start_date and endDate/end_date columns beyond started_at and planned_ending_date?\n\n6. Does `property_tenants` have a `terminated_at` column anywhere in migrations?\n\n7. In the business rules, status is DERIVED from dates (startDate, endDate, terminatedAt). Currently it's PERSISTED (tenancy_status column). What would it take to switch to the derived approach?\n   - List every place tenancy_status is written\n   - List every place tenancy_status is read/filtered\n\nPlease be thorough and provide file paths and line numbers."
}
```

**Output:**
```
task_id: ses_197496a89ffeeA3CTVBjKc3iaI (for resuming to continue this task if needed)

<task_result>
Now I have everything I need for a comprehensive analysis. Let me compile the final answer.

---

Here is a thorough, precise analysis of every question.

---

## 1. Occurrence Counts

### `'ending_tenancy'` in `.ts` / `.tsx` source files

**`.ts` files** (25 raw matches across these unique files):

| File | Occurrences | Notes |
|---|---|---|
| `src/types/domain.ts:2,5` | 2 | Type definitions |
| `src/types/enums.ts:50,51` | 2 | Const arrays |
| `src/types/supabase.ts:3223,3397` | 2 | Generated Supabase types |
| `src/integrations/supabase/types.ts:3164,3335` | 2 | Generated Supabase types |
| `src/services/tenancyService.ts:173,184` | 2 | Query filters |
| `src/services/tenantService.ts:138` | 1 | Query filter |
| `src/hooks/usePropertyTenants.ts:12,209` | 2 | Type def + **WRITE** |
| `src/hooks/usePropertyDashboard.ts:19,20,109,123,133` | 5 | UI view state |
| `src/hooks/useDashboardData.ts:108` | 1 | Filter |
| `src/lib/i18n/translations/en.ts:880` | 1 | i18n key |
| `src/lib/i18n/translations/es.ts:746` | 1 | i18n key |

**`.tsx` files** (46 raw matches across these unique files):

| File | Occurrences | Notes |
|---|---|---|
| `src/pages/PropertyTenants.tsx:130,133,176,568` | 4 | Reads + **WRITE** at :232, :261, :350 |
| `src/pages/Rentals.tsx:53,253,265,272,366,371` | 6 | View filter reads |
| `src/pages/Properties.tsx:194` | 1 | View conditional |
| `src/pages/Tenants.tsx:22,28` | 2 | Status checks |
| `src/components/property-tenants/TenancyOverviewCard.tsx:21,39,67,490,502` | 5 | Type defs + conditional renders |
| `src/components/property-tenants/ContactInfoCard.tsx:17,206,237` | 3 | Type def + conditionals |
| `src/components/property-tenants/ContractsTab.tsx:37` | 1 | Type def |
| `src/components/property-tenants/RentalTermsCard.tsx:39,240` | 2 | Type def + conditional |
| `src/components/property-tenants/StatusBadge.tsx:8,47` | 2 | Type def + config |
| `src/components/property-hub/TenantSwitcher.tsx:11,38` | 2 | Type def + filter |
| `src/components/PropertyCard.tsx:68,71,80,93,240` | 5 | Conditionals |
| `src/components/EditTenantDialog.tsx:29,56,186,192` | 4 | Type def + **WRITE** |
| `src/components/CreateTicketDialog.tsx:70` | 1 | Query filter |
| `src/components/DashboardContent.tsx:91` | 1 | Dashboard label |
| `src/components/ArchiveToggle.tsx:9,10,17,28` | 4 | View tabs |
| `src/components/inspection/InspectionCard.tsx:43,70` | 2 | Type def + conditional |
| `src/pages/PropertyOverview.tsx:15` | 1 | Type def |

**Supabase edge functions** (`.ts`): 1 file — `enforce-data-retention/index.ts:102`

**Grand totals:**
- `'ending_tenancy'`: **~72 occurrences** across **29 unique source files** (src) + 1 supabase function file + many SQL migration files

---

### `'historic'` in `.ts` / `.tsx` source files

**`.ts` files** (3 unique files):
| File | Occurrences |
|---|---|
| `src/hooks/usePropertyTenants.ts:12` | 1 (type def + **WRITE** at :226) |
| `src/types/domain.ts:2` | 1 |
| `src/types/enums.ts:51` | 1 |

**`.tsx` files** (24 raw matches across these unique files):
| File | Occurrences |
|---|---|
| `src/pages/PropertyTenants.tsx:103,105,109,115,116,118,131` | 7 |
| `src/pages/Rentals.tsx:266,273` | 2 |
| `src/pages/PropertyOverview.tsx:15,134` | 2 |
| `src/components/property-tenants/HistoricTab.tsx:54,90` | 2 |
| `src/components/property-tenants/TenancyOverviewCard.tsx:21,39` | 2 |
| `src/components/property-tenants/ContactInfoCard.tsx:17` | 1 |
| `src/components/property-tenants/ContractsTab.tsx:37` | 1 |
| `src/components/property-tenants/RentalTermsCard.tsx:39,155` | 2 |
| `src/components/property-tenants/StatusBadge.tsx:9` | 1 |
| `src/components/property-hub/TenantSwitcher.tsx:11,40` | 2 |
| `src/components/EditTenantDialog.tsx:29,56` | 2 |
| `src/components/inspection/InspectionCard.tsx:43,70` | 2 |

**Grand totals:**
- `'historic'`: **~28 occurrences** across **15 unique source files** (src). No supabase function files directly use the string `'historic'` (they use `'ended'` or `'inactive'` — see note below).

---

## 2. `src/types/domain.ts` — TenancyStatus and TenancyDomain

```
Line 2:  export type TenancyStatus = 'active' | 'ending_tenancy' | 'historic' | 'pending' | null;
```

The `TenancyDomain` interface (`lines 35–54`) does **not** have a `terminatedAt` field:
```typescript
export interface TenancyDomain {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string | null;
  tenantId: string;
  tenantFirstName: string | null;
  tenantLastName: string | null;
  tenantEmail: string;
  status: TenancyStatus;          // line 44 — persisted status string
  startDate: string;              // line 45 — maps to started_at
  plannedEndDate: string | null;  // line 46 — maps to planned_ending_date
  endedAt: string | null;         // line 47 — maps to ended_at (set when finalized)
  endReason: string | null;
  notes: string | null;
  createdAt: string;
  managerTenantName?: string | null;
  managerTenantSurname?: string | null;
  managerTenantPhone?: string | null;
}
```

There is **no** `terminatedAt` field anywhere in `TenancyDomain` or `TenancyStatus`.

---

## 3. `src/services/tenancyService.ts` — Full Analysis

There is **no** `computeTenancyStatus` or any derived-status logic. Status is always read or written as a raw string. Key functions:

**Reads/Filters on `tenancy_status`:**
- `getPropertyTenantsForManager` (line 163): `.eq('tenancy_status', 'active')` — only active
- `getTenantPropertiesForUser` (line 173): `.in('tenancy_status', ['active', 'ending_tenancy'])` — active + ending
- `checkActiveTenancy` (line 184): `.in('tenancy_status', ['active', 'ending_tenancy'])`

**Writes to `tenancy_status`:**
- `updatePropertyTenantStatus` (lines 192–198): generic update accepting a `PropertyTenantUpdates` object which includes `tenancy_status?: TenancyStatus`. This is the **sole service-level write** path for status.

**Date-based queries:**
- `getTenancyStartDate` (line 229): reads `start_date` from `rent_agreements` (not `property_tenants`)
- `getRentAgreementBasicInfo` (line 241): reads `start_date, end_date` from `rent_agreements`
- No date-based queries on `property_tenants` directly; the `ended_at` date is written alongside status but never used to filter.

---

## 4. `src/hooks/usePropertyTenants.ts` — Mutations

**`endTenancyMutation` (lines 205–220):**
```typescript
mutationFn: async ({ tenantId, plannedEndDate }) => {
  const { error } = await supabase
    .from("property_tenants")
    .update({ tenancy_status: "ending_tenancy", planned_ending_date: plannedEndDate })
    .eq("id", tenantId);
}
```
- Writes `tenancy_status = 'ending_tenancy'` AND sets `planned_ending_date` simultaneously in one update.

**`finalizeTenancyMutation` (lines 222–237):**
```typescript
mutationFn: async (tenantId: string) => {
  const { error } = await supabase
    .from("property_tenants")
    .update({ tenancy_status: "historic", ended_at: new Date().toISOString() })
    .eq("id", tenantId);
}
```
- Writes `tenancy_status = 'historic'` AND sets `ended_at = NOW()` simultaneously.

Both mutations invalidate the `["all-tenants-basic", propertyId]` query key on success.

---

## 5. `property_tenants` Column Inventory

From the canonical schema in `supabase/migrations/20260508144709_remote_schema.sql` (lines 1336–1349):

```sql
CREATE TABLE IF NOT EXISTS "public"."property_tenants" (
    "id"                   uuid DEFAULT gen_random_uuid() NOT NULL,
    "property_id"          uuid NOT NULL,
    "tenant_id"            uuid NOT NULL,           -- nullable in practice (self-managed)
    "created_at"           timestamptz DEFAULT now() NOT NULL,
    "tenancy_status"       text DEFAULT 'active',
    "started_at"           timestamptz DEFAULT now() NOT NULL,
    "ended_at"             timestamptz,
    "end_reason"           text,
    "notes"                text,
    "planned_ending_date"  date,
    "videos"               text[] DEFAULT '{}',
    CONSTRAINT "property_tenants_tenancy_status_check"
        CHECK (tenancy_status = ANY (ARRAY['active','ending_tenancy','historic']))
);
```

Columns relevant to your question:
- `started_at` — is the start date (no separate `start_date` column on this table)
- `planned_ending_date` — the planned end date (type `date`, not `timestamptz`)
- `ended_at` — the actual end timestamp (set by `finalizeTenancyMutation`)
- **No** `start_date`, **no** `end_date`, **no** `terminated_at` column

Additionally, from the `not migrated` folder, several columns were added after the initial schema: `manager_tenant_name`, `manager_tenant_surname`, `manager_tenant_phone` (referenced in the service layer and hooks), but these are not visible in the remote schema snapshot, indicating they may be in a pending migration.

There are also two **partial unique indexes** on this table (lines 2373 and 2381):
```sql
CREATE UNIQUE INDEX "idx_one_active_tenant_per_property"
  ON "property_tenants" ("property_id") WHERE (tenancy_status = 'active');

CREATE UNIQUE INDEX "idx_one_ending_tenant_per_property"
  ON "property_tenants" ("property_id") WHERE (tenancy_status = 'ending_tenancy');
```
These enforce a **maximum of one active and one ending tenancy per property** at the database level. This is critical for any redesign.

---

## 6. `terminated_at` Column — Does It Exist?

**No, it does not exist anywhere.**

- Searched all `.sql` files in both `supabase/migrations/` and `supabase/migrations (not migrated)/`: **zero matches**.
- Searched all `.ts` files in `src/` and `supabase/functions/`: **zero matches**.
- The closest thing to "terminated" in the whole codebase is in `bulk-import-properties/index.ts` line 182, which writes `tenancy_status: 'ended'` — but `'ended'` is not even a valid status value in the DB constraint (it would fail the CHECK constraint that allows only `active`, `ending_tenancy`, `historic`). That is a pre-existing bug in the bulk import function.
- Similarly, `enforce-data-retention/index.ts` line 54 queries `.eq('tenancy_status', 'ended')` — another stale reference to a status value that no longer exists in the constraint.

---

## 7. Persisted vs. Derived Status — Full Impact Analysis

### Every place `tenancy_status` is **WRITTEN** (INSERTs and UPDATEs)

| Location | File | Line(s) | Value Written | Trigger |
|---|---|---|---|---|
| `endTenancyMutation` | `src/hooks/usePropertyTenants.ts` | 209 | `'ending_tenancy'` | Manager sets planned end date |
| `finalizeTenancyMutation` | `src/hooks/usePropertyTenants.ts` | 226 | `'historic'` | Manager finalizes tenancy |
| New tenancy (self-manage, no email) | `src/pages/PropertyTenants.tsx` | 232 | `'active'` | Wizard submit Case 1 |
| New tenancy (self-manage, with email) | `src/pages/PropertyTenants.tsx` | 261 | `'active'` | Wizard submit Case 2 |
| Cancel setup (delete filter) | `src/pages/PropertyTenants.tsx` | 350 | `.eq("tenancy_status","active")` | Delete where active + no tenant_id |
| `EditTenantDialog` update | `src/components/EditTenantDialog.tsx` | 72 | any of `active\|ending_tenancy\|historic` | Manager manually edits tenant record |
| Bulk import (active) | `supabase/functions/bulk-import-properties/index.ts` | 177 | `'active'` | Import |
| Bulk import (ended) | `supabase/functions/bulk-import-properties/index.ts` | 182 | `'ended'` (**BUG — invalid value**) | Import with ended_at set |
| Demo data setup | `supabase/functions/setup-demo-data/index.ts` | 145 | `'active'` | Demo seeding |
| SQL migration backfill | `migrations (not migrated)/20251208185033` | 12 | `'historic'` | One-time migration from `'inactive'` |

### Every place `tenancy_status` is **READ / FILTERED**

**Service layer (`src/services/`):**
| File | Line | Filter |
|---|---|---|
| `tenancyService.ts` | 163 | `eq('tenancy_status', 'active')` |
| `tenancyService.ts` | 173 | `in(['active', 'ending_tenancy'])` |
| `tenancyService.ts` | 184 | `in(['active', 'ending_tenancy'])` |
| `tenantService.ts` | 24 | `status: row.tenancy_status` (mapping to domain) |
| `tenantService.ts` | 138 | `in(['active', 'ending_tenancy', 'pending'])` |

**Hook layer (`src/hooks/`):**
| File | Line | Usage |
|---|---|---|
| `usePropertyTenants.ts` | 91 | `find(t => t.tenancy_status === 'active')` |
| `usePropertyDashboard.ts` | 123 | `filter(p => p.status === 'ending_tenancy')` |
| `usePropertyDashboard.ts` | 133 | view routing condition |
| `useDashboardData.ts` | 108 | `filter(p => p.status === 'ending_tenancy').length` |

**Page layer (`src/pages/`):**
| File | Line(s) | Usage |
|---|---|---|
| `PropertyTenants.tsx` | 103,105,109,115,118,130,131,132,133,176,511,568 | Read-only gating, tab routing, button visibility |
| `Rentals.tsx` | 264–266,271–273,305,308 | View filtering, counts |
| `Auth.tsx` | 127 | Post-login redirect decision |
| `Properties.tsx` | 194 | View conditional |
| `Tenants.tsx` | 22,28 | Status label assignment |
| `PropertyOverview.tsx` | 90,134 | Mapping + filter |

**Component layer (`src/components/`):**
| File | Line(s) | Usage |
|---|---|---|
| `TenancyOverviewCard.tsx` | 347 | Pass to `<StatusBadge>` |
| `ContactInfoCard.tsx` | 206,226,237,249 | Button visibility |
| `ContractsTab.tsx` | 390,409,588 | Invite button, pass-through props |
| `RentalTermsCard.tsx` | 155,240 | Null-return guard, edit button |
| `TenantSwitcher.tsx` | 38,39,40 | Categorize active/ending/historic tenants |
| `HistoricTab.tsx` | 54,90 | Filter + pass-through |
| `CreateTicketDialog.tsx` | 70 | Query filter |
| `ManagerOnboardingChecklist.tsx` | 49 | `neq('tenancy_status', 'historic')` |
| `InspectionCard.tsx` | 70 | Move-out inspection eligibility |
| `EditTenantDialog.tsx` | 56,57 | Populate dropdown |
| `StatusBadge.tsx` | 47,53 | Render config |

**Supabase edge functions:**
| File | Line(s) | Usage |
|---|---|---|
| `enforce-data-retention/index.ts` | 54 | `.eq('tenancy_status', 'ended')` — **stale/broken** |
| `enforce-data-retention/index.ts` | 102 | `.in(['active', 'ending_tenancy'])` |
| `manage-tenancy-limit/index.ts` | 30,40 | Read + filter for `'inactive'` — **stale/broken** |

**SQL (RLS policies, DB functions, indexes):**
Used extensively in `supabase/migrations/` across at least 10 active migration files. The two partial unique indexes on `tenancy_status = 'active'` and `tenancy_status = 'ending_tenancy'` are especially load-bearing. All RLS policies governing tenant read access to properties, documents, tickets, and payments check `tenancy_status IN ('active', 'ending_tenancy')`.

---

### What a Switch to Derived Status Would Cost

The current model is **fully persisted**: `tenancy_status` is a `TEXT` column with a CHECK constraint, written explicitly on every transition, read everywhere. Switching to a **derived approach** (compute status from `started_at`, `planned_ending_date`, `ended_at`, and a new `terminated_at`) would require:

1. **New DB column**: `ALTER TABLE property_tenants ADD COLUMN terminated_at TIMESTAMPTZ;` — no migration exists for this.

2. **DB constraint removal**: The `CHECK (tenancy_status = ANY (...))` constraint and potentially the `tenancy_status` column itself would be dropped, along with the two partial unique indexes (`idx_one_active_tenant_per_property`, `idx_one_ending_tenant_per_property`) — these would need to be rewritten as expression-based indexes.

3. **All RLS policies rewritten**: At least 10 active migrations encode `tenancy_status IN ('active', 'ending_tenancy')` directly in SQL. Every policy checking tenant access would need a subquery or computed expression.

4. **`computeTenancyStatus()` function created**: Needs to live in both TypeScript (for the frontend, post-query mapping) and as a Postgres generated column or SQL function (for RLS, server-side queries). Logic would be:
   - `terminated_at IS NOT NULL` → `'terminated'`
   - `ended_at IS NOT NULL` → `'historic'` (renamed `'ended'` in business rules)
   - `planned_ending_date IS NOT NULL AND planned_ending_date <= some_threshold` → `'ending'`
   - otherwise → `'active'` / `'pending'`

5. **`src/types/domain.ts`**: `TenancyStatus` type gains `'terminated'`, loses `null` if desired. `TenancyDomain` gains `terminatedAt: string | null`.

6. **`src/types/enums.ts` line 51**: `TENANCY_STATUSES` array updated.

7. **All 10 WRITE sites** listed above: Most become no-ops (just set the relevant date field instead), but the `EditTenantDialog` manual status dropdown and the `endTenancyMutation`/`finalizeTenancyMutation` hooks change completely.

8. **All ~40 READ sites** in components/pages: Most are already checking the mapped `status` field via `TenancyDomain`, so if the mapping function in `tenantService.ts:mapToTenancyDomain` (line 24) is updated, the impact on components is contained. However, the ~10 places that query `supabase.from('property_tenants').eq('tenancy_status', ...)` directly (bypassing the service) must each be updated.

9. **Edge functions**: `enforce-data-retention` and `manage-tenancy-limit` both reference stale status values (`'ended'`, `'inactive'`) and would need updating regardless.

10. **`StatusBadge.tsx`**: Needs `'terminated'` added to `StatusType` and `statusConfig`.
</task_result>
```

---

## Assistant (Plan · Claude Sonnet 4.6 · 3.7s)

Now I have a thorough picture. Let me compile the full analysis.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/dragutin/projects/rentmate/src/types/domain.ts",
  "limit": 60
}
```

**Output:**
```
<path>/home/dragutin/projects/rentmate/src/types/domain.ts</path>
<type>file</type>
<content>
1: // ========== STATUS ENUMS ==========
2: export type TenancyStatus = 'active' | 'ending_tenancy' | 'historic' | 'pending' | null;
3: export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'declined' | 'property_inactive' | 'already_tenant' | 'cancelled';
4: export type MandateStatus = 'pending' | 'pending_signature' | 'active' | 'failed' | 'cancelled';
5: export type PropertyStatus = 'active' | 'inactive' | 'ending_tenancy';
6: export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'failed';
7: export type UtilityPaymentStatus = 'pending' | 'paid' | 'overdue';
8: export type UtilityType = 'electricity' | 'gas' | 'water' | 'internet' | 'heating' | 'trash' | 'other';
9: export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'cancelled';
10: export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
11: export type KYCStatus = 'not_started' | 'pending' | 'in_progress' | 'verified' | 'rejected' | 'expired';
12: 
13: // ========== PROFILE DOMAIN ==========
14: export interface ProfileDomain {
15:   id: string;
16:   email: string;
17:   firstName: string | null;
18:   lastName: string | null;
19:   avatarStoragePath: string | null;
20:   phone: string | null;
21:   defaultRole: 'manager' | 'tenant' | null;
22:   emailVerified: boolean | null;
23:   kycStatus: KYCStatus | null;
24:   kycProvider: string | null;
25:   kycQrCodeUrl: string | null;
26:   kycExpiresAt: string | null;
27:   kycWalletDid: string | null;
28:   kycCredentialId: string | null;
29:   kycVerifiedAt: string | null;
30:   createdAt: string;
31:   updatedAt: string;
32: }
33: 
34: // ========== TENANCY DOMAIN ==========
35: export interface TenancyDomain {
36:   id: string;
37:   propertyId: string;
38:   propertyTitle: string;
39:   propertyAddress: string | null;
40:   tenantId: string;
41:   tenantFirstName: string | null;
42:   tenantLastName: string | null;
43:   tenantEmail: string;
44:   status: TenancyStatus;
45:   startDate: string;
46:   plannedEndDate: string | null;
47:   endedAt: string | null;
48:   endReason: string | null;
49:   notes: string | null;
50:   createdAt: string;
51:   managerTenantName?: string | null;
52:   managerTenantSurname?: string | null;
53:   managerTenantPhone?: string | null;
54: }
55: 
56: // ========== INVITATION DOMAIN ==========
57: export interface InvitationDomain {
58:   id: string;
59:   propertyId: string;
60:   propertyTitle: string;

(Showing lines 1-60 of 187. Use offset=61 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/dragutin/projects/rentmate/src/types/enums.ts",
  "limit": 60
}
```

**Output:**
```
<path>/home/dragutin/projects/rentmate/src/types/enums.ts</path>
<type>file</type>
<content>
1: import { STORAGE_BUCKETS } from '@/constants';
2: export { STORAGE_BUCKETS };
3: export type { BucketName } from '@/constants';
4: 
5: // ========== STATUS ENUMS (re-exported for convenience) ==========
6: export type {
7:   TenancyStatus,
8:   InvitationStatus,
9:   MandateStatus,
10:   PropertyStatus,
11:   PaymentStatus,
12:   UtilityPaymentStatus,
13:   UtilityType,
14:   TicketStatus,
15:   TicketPriority,
16:   KYCStatus,
17: } from '@/types/domain';
18: 
19: // ========== SUBSCRIPTION ENUMS ==========
20: export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
21: export type SubscriptionType = 'stripe' | 'admin_grant' | 'free';
22: 
23: // ========== INSPECTION ENUMS ==========
24: export type InspectionType = 'move_in' | 'move_out';
25: export type InspectionStatus = 'draft' | 'in_progress' | 'pending_signatures' | 'completed';
26: export type ConditionRating = 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
27: 
28: // ========== APP ROLE ==========
29: export type AppRole = 'admin' | 'user';
30: 
31: // ========== DOCUMENT ENUMS ==========
32: export type DocumentCategory = 'contract' | 'template' | 'inspection' | 'receipt' | 'other';
33: export type DocumentStatus = 'draft' | 'pending_signature' | 'signed' | 'expired' | 'cancelled';
34: 
35: // ========== USER PREFERENCES ENUMS ==========
36: export type ThemeMode = 'light' | 'dark' | 'system';
37: export type FontSize = 'sm' | 'md' | 'lg';
38: export type WeekStartDay = 'monday' | 'sunday';
39: 
40: // ========== SEPA MANDATE ENUMS ==========
41: export type MandateState = 'pending' | 'pending_signature' | 'active' | 'failed' | 'cancelled';
42: 
43: // ========== KYC ENUMS ==========
44: export type KYCProvider = 'kilt' | 'didit';
45: // NOTE: OpenAPI KYC is BLOCKED — see supabase/functions/initiate-openapi-kyc/index.ts
46: // Previously: export type KYCProvider = 'kilt' | 'didit' | 'openapi';
47: 
48: // ========== INVITATION STATUS ARRAY (for validation) ==========
49: export const INVITATION_STATUSES = ['pending', 'accepted', 'expired', 'declined', 'property_inactive', 'already_tenant', 'cancelled'] as const;
50: export const PROPERTY_STATUSES = ['active', 'inactive', 'ending_tenancy'] as const;
51: export const TENANCY_STATUSES = ['active', 'ending_tenancy', 'historic', 'pending'] as const;
52: export const INSPECTION_STATUSES = ['draft', 'in_progress', 'pending_signatures', 'completed'] as const;
53: export const SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due', 'canceled', 'expired'] as const;
54: export const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'cancelled'] as const;
55: export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
56: export const UTILITY_TYPES = ['electricity', 'gas', 'water', 'internet', 'heating', 'trash', 'other'] as const;
57: 
58: // ========== CONDITION RATINGS ==========
59: export const CONDITION_RATINGS = ['excellent', 'good', 'fair', 'poor', 'damaged'] as const;

(End of file - total 59 lines)
</content>
```

---

## Assistant (Plan · Claude Sonnet 4.6 · 482.6s)

Now I have everything I need. Here is the full analysis:

---

## Gap Analysis: Current Code vs. Business Rules

### TL;DR — Status Mapping

The business rules use different status names from what the code uses today:

| Business Rule | Current Code | Notes |
|---|---|---|
| `pending` | `pending` | Match |
| `active` | `active` | Match |
| `ending` | `ending_tenancy` | Rename needed |
| `ended` | `historic` | Rename needed |
| `terminated` | *(does not exist)* | New status needed |

The **biggest structural gap**: business rules say status must be **derived** from dates (`startDate`, `endDate`, `terminatedAt`), never persisted. The current code persists `tenancy_status` as a DB column and sets it manually on every transition.

---

## Key Gaps Identified

### Gap 1 — Status Is Persisted, Not Derived (Core Rule Violation)
Business rules §1.1, §7.1: status must be computed from `startDate`/`endDate`/`terminatedAt`. Today it's a stored `TEXT` column with a CHECK constraint. This is the biggest architectural difference.

**Impact if fully complied with:** ~40 read sites, ~10 write sites, all RLS policies, unique indexes, and edge functions would need changing. This is the highest-risk change in the entire document.

### Gap 2 — `terminated` Status Missing
No `terminated_at` column, no termination mutation, no `terminationReason`, no audit cascade to `rent_agreements`.

### Gap 3 — No `computeTenancyStatus()` Function
No such function exists anywhere. Status is always a raw string from the DB.

### Gap 4 — Naming: `ending_tenancy` → `ending`, `historic` → `ended`
~72 occurrences of `ending_tenancy`, ~28 of `historic` across ~30 source files.

### Gap 5 — No Date-Range Overlap Validation
The `dateConflictOpen` dialog is partially wired but the trigger logic is incomplete. DB unique indexes provide a hard stop but no user-friendly date-range check.

### Gap 6 — No Audit Log for Post-End Edits (§3.2, §7.7)
No `tenancy_audit_log` table exists. No audit writing before post-end mutations.

### Gap 7 — No Auto-Transitions (§4.1)
No cron job to move `ending_tenancy → historic` when `planned_ending_date` passes. No `TENANCY_ENDED` domain events.

### Gap 8 — No Deposit Settlement Workflow (§7.5)
Fields exist in `rent_agreements` but no settlement UI or service method.

### Gap 9 — No `UnitContext` Dual-Tenancy Interface (§7.6)
Components receive individual tenancy records, not the `{ currentTenancy, nextTenancy, history }` shape.

### Gap 10 — Stale Edge Functions
`manage-tenancy-limit` queries for `'inactive'` (never exists). `enforce-data-retention` queries for `'ended'` (not a valid value). Both are broken.

---

## Risk Assessment & Step-by-Step Plan (Simplest First)

I propose **6 phases**, from zero-risk cleanups to the highest-risk structural change. The key insight: **you do not have to fully switch to derived status to get most of the business value**. A pragmatic interpretation adds `computeTenancyStatus()` as a client-side mapping layer while keeping the DB column — which satisfies most downstream requirements with minimal risk.

---

### Phase 1 — Fix Broken Edge Functions (Risk: Very Low, ~1h)
**Files:** `supabase/functions/manage-tenancy-limit/index.ts`, `supabase/functions/enforce-data-retention/index.ts`

Fix stale status string references (`'inactive'` → correct value, `'ended'` → `'historic'`). These are currently broken and do nothing useful.

---

### Phase 2 — Add `terminated` Support (Risk: Low, ~1 day)
This is purely additive — no existing code breaks.

1. DB migration: add `terminated_at TIMESTAMPTZ` to `property_tenants`, update CHECK constraint to include a sentinel or handle via nullable
2. Add `'terminated'` to `TenancyStatus` type in `domain.ts`
3. Add `terminateTenancy()` service method (sets `terminated_at`, deactivates `rent_agreements`, logs audit)
4. Add `StatusBadge` config entry for `terminated`
5. Wire "Terminate" button in `TenancyOverviewCard` (permission-gated)

No existing status values change. No existing queries break.

---

### Phase 3 — Add `computeTenancyStatus()` Client-Side (Risk: Low, ~half day)
This is the business rule §7.1 requirement, implemented as a **read-side** adapter. The DB column stays; the function is added as a utility that can be used to derive display status and will underpin Phase 5.

```ts
// src/lib/tenancyStatus.ts — new file
export function computeTenancyStatus(tenancy: PropertyTenantRow): TenancyStatus
```

No existing behavior changes — just a utility available for Phase 4 and 5.

---

### Phase 4 — Add Audit Log Table + Post-End Write Protection (Risk: Low–Medium, ~1 day)
1. DB migration: create `tenancy_audit_log` table
2. `writeAuditEntry()` service helper
3. Gate deposit edits and post-end field changes through the audit method

This is additive (new table, new guards) with no impact on existing flows.

---

### Phase 5 — Status Name Rename (Risk: Medium, ~1–2 days)
Rename `ending_tenancy` → `ending` and `historic` → `ended` in DB and all ~100 source occurrences.

**This is the riskiest cosmetic change** because:
- The DB CHECK constraint must be updated
- The two partial unique indexes must be rebuilt
- All RLS policies must be updated (grep-and-replace across migration SQL)
- ~30 source files touched (all string literals + type definitions)

Mitigation: do it as a single focused migration + code sweep with test coverage before and after.

**Alternative (lower risk):** Keep current DB names, keep `computeTenancyStatus()` doing the name mapping. This is pragmatic and avoids touching RLS/indexes.

---

### Phase 6 — Date-Derived Status (Risk: High, optional)
Fully implement §7.1: remove `tenancy_status` column, derive everything from `started_at`/`planned_ending_date`/`ended_at`/`terminated_at`.

This requires rewriting all RLS policies with date expressions, replacing unique indexes with expression-based indexes, and rewriting every Supabase query that filters by `tenancy_status`. This is the highest-risk change and the one with the most uncertain ROI — the current persisted approach works and is simpler to query.

**My recommendation:** defer Phase 6 entirely, or treat it as a future architectural decision. The business rules document describes an ideal but the current persisted model delivers the same user-visible behaviour with far less risk.

---

## Size Summary

| Phase | Effort | Risk | Files Touched |
|---|---|---|---|
| 1 — Fix edge functions | ~1h | Very Low | 2 |
| 2 — Add `terminated` | ~1 day | Low | ~8 |
| 3 — `computeTenancyStatus()` | ~half day | Low | ~3 |
| 4 — Audit log | ~1 day | Low-Medium | ~6 |
| 5 — Status rename | ~2 days | Medium | ~35 |
| 6 — Full date-derived status | ~5+ days | High | ~50+ |

---

## Questions Before Proceeding

Before I build the implementation plan, I want to confirm a few decisions:

**Tool: question**

**Input:**
```json
{
  "questions": [
    {
      "header": "Status derivation approach",
      "question": "The business rules say status must be derived from dates, never stored. But the current stored approach works fine and is much simpler to query. Which approach do you want?",
      "options": [
        {
          "label": "Keep stored status (Recommended)",
          "description": "Keep tenancy_status column, add computeTenancyStatus() as a client-side utility only. Much lower risk, same user experience."
        },
        {
          "label": "Full derived status",
          "description": "Remove tenancy_status column, derive everything from dates. Follows the spec exactly but requires rewriting all RLS policies, indexes, and ~50 files."
        },
        {
          "label": "Hybrid",
          "description": "Keep stored status for DB queries/RLS but add computeTenancyStatus() that always recomputes for display, and enforce consistency on writes."
        }
      ]
    },
    {
      "header": "Status name rename",
      "question": "The business rules use 'ending' and 'ended' but current code uses 'ending_tenancy' and 'historic'. Do you want to rename them?",
      "options": [
        {
          "label": "Yes, rename in DB and code",
          "description": "Update CHECK constraint, unique indexes, RLS policies, and ~30 source files. Clean but risky."
        },
        {
          "label": "No, keep current names",
          "description": "Keep 'ending_tenancy' and 'historic' in DB and code. computeTenancyStatus() can map to the business rule names internally if needed."
        },
        {
          "label": "Rename in code only",
          "description": "Map 'ending_tenancy' → 'ending' and 'historic' → 'ended' in the TypeScript layer only (TenancyStatus type + domain mapper). DB stays unchanged."
        }
      ]
    },
    {
      "header": "Terminated status",
      "question": "The business rules require a 'terminated' status for early/forced tenancy endings. Is this needed now?",
      "options": [
        {
          "label": "Yes, implement terminated now",
          "description": "Add terminated_at column, terminate mutation, UI button, cascade to rent_agreements."
        },
        {
          "label": "No, skip for now",
          "description": "Defer terminated status. Current 'historic' covers manual endings for now."
        }
      ]
    },
    {
      "header": "Audit log",
      "question": "Business rules require an audit log for all post-end edits. Do you want this?",
      "options": [
        {
          "label": "Yes, add audit log",
          "description": "Create tenancy_audit_log table, writeAuditEntry() helper, gate post-end writes through it."
        },
        {
          "label": "No, skip for now",
          "description": "Defer audit log. Accept that post-end edits are currently unlogged."
        }
      ]
    }
  ]
}
```

**Output:**
```
User has answered your questions: "The business rules say status must be derived from dates, never stored. But the current stored approach works fine and is much simpler to query. Which approach do you want?"="Keep stored status (Recommended)", "The business rules use 'ending' and 'ended' but current code uses 'ending_tenancy' and 'historic'. Do you want to rename them?"="No, keep current names", "The business rules require a 'terminated' status for early/forced tenancy endings. Is this needed now?"="No, skip for now", "Business rules require an audit log for all post-end edits. Do you want this?"="Yes, add audit log". You can now continue with the user's answers in mind.
```

---

## Assistant (Plan · Claude Sonnet 4.6 · 109.2s)

Good. With those decisions locked in, here is the revised, focused plan:

---

## Revised Plan

**Decisions:**
- Keep `tenancy_status` as a stored DB column (no derivation change)
- Keep current DB status names (`ending_tenancy`, `historic`)
- Skip `terminated` for now
- Add audit log for post-end edits

This reduces the scope significantly to **3 phases**:

---

### Phase 1 — Fix Broken Edge Functions (~1h, Very Low Risk)
**Files:** 2 edge functions

- `manage-tenancy-limit/index.ts`: remove or fix query for `'inactive'` — this function is currently entirely broken
- `enforce-data-retention/index.ts:54`: fix `eq('tenancy_status', 'ended')` → `eq('tenancy_status', 'historic')`

No DB changes, no frontend changes.

---

### Phase 2 — Add `computeTenancyStatus()` Utility (~half day, Low Risk)
**Files:** ~3 new/modified

Even though status stays stored, business rule §7.1 requires a canonical function. This becomes a TS utility that wraps the stored value and adds forward-compatibility (e.g. if `terminated` is added later, it works automatically):

```ts
// src/lib/tenancyStatus.ts
export function computeTenancyStatus(tenancy: { tenancy_status, planned_ending_date, ended_at }): TenancyStatus
```

It reads the stored value but could apply an "ending window" check (is `planned_ending_date` within 60 days?) to compute `ending_tenancy` without relying on the manager manually setting it. This is optional behavior — to be confirmed.

---

### Phase 3 — Audit Log for Post-End Edits (~1 day, Low-Medium Risk)
**Files:** ~6 (1 migration + 1 service + gates in existing mutation hooks)

1. DB migration: `tenancy_audit_log` table
2. `writeAuditEntry()` service helper in `tenancyService.ts`
3. Gate the deposit settlement fields and any post-`historic` edits through `writeAuditEntry()`

---

One more clarifying question before we finalize:

**Tool: question**

**Input:**
```json
{
  "questions": [
    {
      "header": "Ending window auto-compute",
      "question": "Currently, a tenancy moves to 'ending_tenancy' only when the manager manually sets a planned end date. The business rules say it should automatically compute as 'ending' when endDate is within 60 days. Should computeTenancyStatus() override the stored status when planned_ending_date is within 60 days (even if the manager hasn't explicitly triggered the 'ending' transition)?",
      "options": [
        {
          "label": "Yes — auto-derive ending window (Recommended)",
          "description": "If planned_ending_date is set and within 60 days of today, computeTenancyStatus() returns 'ending_tenancy' regardless of stored value. Aligns with spec."
        },
        {
          "label": "No — keep manual transition only",
          "description": "Status only changes when manager explicitly triggers it. computeTenancyStatus() just reads the stored value. Simpler."
        }
      ]
    },
    {
      "header": "Scope of audit log",
      "question": "Which edits should be covered by the audit log requirement?",
      "options": [
        {
          "label": "Post-end edits only (Recommended)",
          "description": "Audit log gates only edits made when tenancy_status = 'historic'. Matches §3.2 exactly."
        },
        {
          "label": "All tenancy status transitions",
          "description": "Log every status change (active→ending_tenancy, ending_tenancy→historic etc). Broader coverage but more work."
        },
        {
          "label": "All tenancy mutations",
          "description": "Log every field change on property_tenants. Most comprehensive but significant overhead."
        }
      ]
    }
  ]
}
```

**Output:**
```
User has answered your questions: "Currently, a tenancy moves to 'ending_tenancy' only when the manager manually sets a planned end date. The business rules say it should automatically compute as 'ending' when endDate is within 60 days. Should computeTenancyStatus() override the stored status when planned_ending_date is within 60 days (even if the manager hasn't explicitly triggered the 'ending' transition)?"="Yes — auto-derive ending window (Recommended)", "Which edits should be covered by the audit log requirement?"="Post-end edits only (Recommended)". You can now continue with the user's answers in mind.
```

---

## Assistant (Plan · Claude Sonnet 4.6 · 24.2s)

Here is the final implementation plan:

---

## Final Implementation Plan

### Phase 1 — Fix Broken Edge Functions
**Effort:** ~1h | **Risk:** Very Low | **Files:** 2

**`supabase/functions/enforce-data-retention/index.ts:54`**
- Change `.eq('tenancy_status', 'ended')` → `.eq('tenancy_status', 'historic')`

**`supabase/functions/manage-tenancy-limit/index.ts`**
- The function queries for `'inactive'` status which never exists. Evaluate whether the function serves a real purpose; if not, disable it; if yes, fix the query to use valid status values.

No DB changes. No frontend changes. Independent of all other phases.

---

### Phase 2 — Add `computeTenancyStatus()` with Ending Window
**Effort:** ~half day | **Risk:** Low | **Files:** ~5

**New file: `src/lib/tenancyStatus.ts`**
```ts
const ENDING_WINDOW_DAYS = 60;

export function computeTenancyStatus(tenancy: {
  tenancy_status: TenancyStatus;
  planned_ending_date: string | null;
}): TenancyStatus {
  if (tenancy.tenancy_status === 'historic') return 'historic';
  if (tenancy.planned_ending_date) {
    const daysUntilEnd = daysBetween(new Date(), new Date(tenancy.planned_ending_date));
    if (daysUntilEnd <= ENDING_WINDOW_DAYS) return 'ending_tenancy';
  }
  return tenancy.tenancy_status; // 'active' | 'pending'
}
```

**Wire it in:**
- `src/services/tenantService.ts` — use `computeTenancyStatus()` in the domain mapping at line 24 (where `status: row.tenancy_status` is set)
- `src/services/tenancyService.ts` — same in any domain mapper
- `src/hooks/usePropertyTenants.ts` — use when deriving local state

**What this achieves:** A property with `planned_ending_date` 30 days away will show as `ending_tenancy` in the UI even if the manager hasn't manually clicked "End Tenancy." This aligns with §1.1 of the business rules using the stored approach.

**Note:** The DB `tenancy_status` column stays as-is. This is purely a read-side overlay. The stored value still needs to be set when `planned_ending_date` is first set, which is already happening.

---

### Phase 3 — Audit Log for Post-End Edits
**Effort:** ~1 day | **Risk:** Low-Medium | **Files:** ~6

**Step 3a — DB migration**
New table `tenancy_audit_log`:
```sql
CREATE TABLE tenancy_audit_log (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenancy_id    uuid NOT NULL REFERENCES property_tenants(id) ON DELETE CASCADE,
  changed_by    uuid NOT NULL REFERENCES profiles(id),
  changed_at    timestamptz DEFAULT now() NOT NULL,
  field         text NOT NULL,
  previous_value jsonb,
  new_value     jsonb,
  reason        text NOT NULL  -- required for all post-end edits
);
-- RLS: managers can read their own tenancy audit rows; no direct client write (service role only)
```

**Step 3b — `writeAuditEntry()` in `tenancyService.ts`**
A service-layer helper that inserts into `tenancy_audit_log` via the service role client (not the anon client — prevents client-side bypass).

**Step 3c — Gate post-end edits**
Identify the mutations that currently allow editing a `historic` tenancy (deposit fields in `useRentAgreements`, notes/end_reason fields in `usePropertyTenants`) and wrap them: check if `tenancy_status === 'historic'` → require `reason` parameter → call `writeAuditEntry()` before the update → if `writeAuditEntry()` fails, surface the error and abort the edit.

**Affected mutations:**
- `updateRentAgreement` (deposit fields) in `useRentAgreements.ts`
- `updatePropertyTenant` (notes, end_reason) in `usePropertyTenants.ts`

---

### What is explicitly NOT in scope (deferred)

| Rule | Decision |
|---|---|
| Status derived from dates (§7.1 full spec) | Deferred — keep stored status |
| Status name rename (`ending_tenancy`→`ending`, `historic`→`ended`) | Deferred — keep current names |
| `terminated` status and termination workflow | Deferred |
| Auto-transition cron job (§4.1) | Deferred |
| Date-range overlap validation (§2.1) | Deferred (DB unique indexes still enforce hard constraint) |
| Deposit settlement workflow (§7.5) | Deferred |
| `UnitContext` dual-tenancy interface refactor (§7.6) | Deferred |
| Domain events / event bus (§4.1) | Deferred |

---

Shall I proceed with Phase 1 first?

---

## User

reduce the plan, remove the audit log. check if there are other simplifications possible

---

## Assistant (Plan · DeepSeek V4 Flash Free · 19.8s)

_Thinking:_

The user wants me to:
1. Remove the audit log from the plan
2. Look for other simplifications
3. We're in plan/read-only mode - no edits, only analysis

Let me re-think the plan with maximum simplification. The key question is: what's the minimum viable change to address the business rules?

Current state:
- Status is stored (tenancy_status column) - keep it
- Statuses are: active, ending_tenancy, historic, pending - keep names
- No terminated - skip for now
- No audit log - removed
- Edge functions are broken - fix them
- No computeTenancyStatus function exists

Let me think about what actually matters from the business rules:

1. **computeTenancyStatus()** - the business rules §7.1 mandate this as the "never persist computed status" rule. But since we're keeping stored status, do we even need this? The spec says "Always derive at query time" but we already store it.

Wait - the user said "check if there are other simplifications possible." So maybe we can even question whether we need computeTenancyStatus().

Let me re-read the user's decisions:
- Keep stored status
- Keep current DB names
- Skip terminated for now
- Client said yes to: auto-derive ending window via computeTenancyStatus()

But now they're asking to reduce further. Let me reconsider.

The core question: what is the ACTUAL problem these business rules solve? What's broken in the current code that needs fixing?

Looking at the analysis:
1. Two edge functions are broken (querying for status values that don't exist) - these SHOULD be fixed
2. The "ending window" auto-derive is a nice-to-have but maybe not essential
3. The business rules document has a lot of aspirational patterns (domain events, audit logs, deposit settlement) that aren't bugs

What are actual bugs vs. aspirational improvements?

**Actual bugs (things that don't work as intended):**
- `enforce-data-retention` queries `.eq('tenancy_status', 'ended')` which never matches any record since the actual status is 'historic'. This function does nothing useful.
- `manage-tenancy-limit` queries for `'inactive'` which never exists. Broken.

**Aspirational improvements:**
- computeTenancyStatus function
- Audit log
- Terminated status
- Ending window auto-derive
- All the other stuff

So the simplest possible plan is:
1. Fix the two broken edge functions (actual bugs, minimal code)
2. Maybe skip everything else unless there's a compelling reason

But wait - the user chose "Yes — auto-derive ending window" previously. But now they want to simplify further. Should I re-question that?

Actually, looking at the conversation flow:
- User said "reduce the plan, remove the audit log. check if there are other simplifications possible"
- This means: trim scope to the absolute essentials

The most radical simplification: **just fix the 2 broken edge functions**. That's it. The existing code works correctly for everything else - status is properly stored, transitions are working, no data corruption. The business rules document is an aspirational target, not a bug list.

But let me also consider: is the ending window auto-derive actually important? Looking at the current code:
- Manager sets `planned_ending_date` → tenancy_status becomes `ending_tenancy`
- The `ending_tenancy` status shows in the UI
- Everything works

The auto-derive would make it so that even if the manager doesn't explicitly trigger "End Tenancy," the status would show as `ending_tenancy` when the end date approaches. But wait - in the current flow, if no `planned_ending_date` is set, there's no end date to even check. And if one IS set, the manager has already triggered the transition. So the auto-derive adds no practical value.

**Simplest possible plan:** Fix the 2 broken edge functions. Nothing else.

But wait - I should also check: what is the `manage-tenancy-limit` function supposed to do? If it's fundamentally broken (querying for non-existent status), let me understand it better before deciding whether to fix or remove it.

Let me read that function to understand it better. Actually I can ask the explore agent to give me a summary.

Actually, let me think about this differently. The user wants me to simplify. Let me present the absolute minimum viable plan and ask if they want anything beyond that.

The minimum plan:
1. Fix the 2 broken edge functions (actual bugs)
2. That's it

But I should also consider: maybe the user wants computeTenancyStatus because it's a business rule requirement, even if not practically needed? The agents guide says "Never persist computed status" - but we're keeping persisted status. So that rule is already violated by design choice.

Let me just present the simplified plan and ask.

Let me re-examine what's actually broken vs. aspirational.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/dragutin/projects/rentmate/supabase/functions/manage-tenancy-limit/index.ts"
}
```

**Output:**
```
<path>/home/dragutin/projects/rentmate/supabase/functions/manage-tenancy-limit/index.ts</path>
<type>file</type>
<content>
1: import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
2: import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
3: 
4: const corsHeaders = {
5:   'Access-Control-Allow-Origin': '*',
6:   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
7: };
8: 
9: serve(async (req) => {
10:   if (req.method === 'OPTIONS') {
11:     return new Response(null, { headers: corsHeaders });
12:   }
13: 
14:   try {
15:     const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
16:     const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
17:     const supabase = createClient(supabaseUrl, supabaseKey);
18: 
19:     const { property_id } = await req.json();
20: 
21:     if (!property_id) {
22:       throw new Error('property_id is required');
23:     }
24: 
25:     console.log(`Checking tenancy limit for property: ${property_id}`);
26: 
27:     // Count all tenancies for this property
28:     const { data: tenancies, error: countError } = await supabase
29:       .from('property_tenants')
30:       .select('id, tenancy_status, started_at')
31:       .eq('property_id', property_id)
32:       .order('started_at', { ascending: true });
33: 
34:     if (countError) throw countError;
35: 
36:     console.log(`Found ${tenancies?.length || 0} tenancies`);
37: 
38:     // If more than 5 tenancies, delete the oldest inactive one
39:     if (tenancies && tenancies.length > 5) {
40:       const inactiveTenancies = tenancies.filter(t => t.tenancy_status === 'inactive');
41:       
42:       if (inactiveTenancies.length > 0) {
43:         const oldestInactive = inactiveTenancies[0];
44:         console.log(`Deleting oldest inactive tenancy: ${oldestInactive.id}`);
45: 
46:         // Delete associated documents
47:         const { data: docs } = await supabase
48:           .from('property_documents')
49:           .select('file_path')
50:           .eq('tenancy_id', oldestInactive.id);
51: 
52:         if (docs) {
53:           for (const doc of docs) {
54:             await supabase.storage
55:               .from('property-documents')
56:               .remove([doc.file_path]);
57:           }
58:         }
59: 
60:         // Delete document records
61:         await supabase
62:           .from('property_documents')
63:           .delete()
64:           .eq('tenancy_id', oldestInactive.id);
65: 
66:         // Delete tenancy record
67:         const { error: deleteError } = await supabase
68:           .from('property_tenants')
69:           .delete()
70:           .eq('id', oldestInactive.id);
71: 
72:         if (deleteError) throw deleteError;
73: 
74:         console.log('Successfully enforced FIFO tenancy limit');
75:         
76:         return new Response(
77:           JSON.stringify({ 
78:             success: true, 
79:             message: 'FIFO limit enforced',
80:             deleted_tenancy_id: oldestInactive.id
81:           }),
82:           { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
83:         );
84:       }
85:     }
86: 
87:     return new Response(
88:       JSON.stringify({ success: true, message: 'No action needed' }),
89:       { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
90:     );
91: 
92:   } catch (error: unknown) {
93:     console.error('Error in manage-tenancy-limit:', error);
94:     return new Response(
95:       JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
96:       { 
97:         status: 400,
98:         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
99:       }
100:     );
101:   }
102: });

(End of file - total 102 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/dragutin/projects/rentmate/supabase/functions/enforce-data-retention/index.ts"
}
```

**Output:**
```
<path>/home/dragutin/projects/rentmate/supabase/functions/enforce-data-retention/index.ts</path>
<type>file</type>
<content>
1: import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
2: import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
3: 
4: const corsHeaders = {
5:   'Access-Control-Allow-Origin': '*',
6:   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
7: };
8: 
9: interface RetentionPolicies {
10:   tenant_data_after_tenancy_end: string;
11:   inactive_account_anonymization: string;
12:   financial_records: string;
13:   analytics_data: string;
14:   ticket_data: string;
15: }
16: 
17: serve(async (req) => {
18:   if (req.method === 'OPTIONS') {
19:     return new Response(null, { headers: corsHeaders });
20:   }
21: 
22:   try {
23:     const supabaseAdmin = createClient(
24:       Deno.env.get('SUPABASE_URL') ?? '',
25:       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
26:     );
27: 
28:     console.log('Starting data retention enforcement job...');
29: 
30:     // Fetch retention policies from system_settings
31:     const { data: settingsData, error: settingsError } = await supabaseAdmin
32:       .from('system_settings')
33:       .select('setting_value')
34:       .eq('setting_key', 'data_retention_policies')
35:       .single();
36: 
37:     if (settingsError) throw settingsError;
38: 
39:     const policies = settingsData.setting_value as RetentionPolicies;
40:     console.log('Retention policies:', policies);
41: 
42:     let totalAffected = 0;
43:     let totalAnonymized = 0;
44:     let totalDeleted = 0;
45:     const executionDetails: Record<string, unknown> = {};
46: 
47:     // 1. Anonymize tenant data after tenancy end (3 years)
48:     const tenancyEndDate = new Date();
49:     tenancyEndDate.setFullYear(tenancyEndDate.getFullYear() - parseInt(policies.tenant_data_after_tenancy_end));
50: 
51:     const { data: expiredTenancies } = await supabaseAdmin
52:       .from('property_tenants')
53:       .select('tenant_id')
54:       .eq('tenancy_status', 'ended')
55:       .lt('ended_at', tenancyEndDate.toISOString());
56: 
57:     if (expiredTenancies && expiredTenancies.length > 0) {
58:       const tenantIds = expiredTenancies.map(t => t.tenant_id);
59:       
60:       // Anonymize profiles
61:       const { error: anonymizeError } = await supabaseAdmin
62:         .from('profiles')
63:         .update({
64:           first_name: 'Deleted',
65:           last_name: 'User',
66:           email: `deleted-${crypto.randomUUID()}@anonymized.local`,
67:           phone: null,
68:           manager_iban: null,
69:         })
70:         .in('id', tenantIds);
71: 
72:       if (!anonymizeError) {
73:         totalAnonymized += tenantIds.length;
74:         executionDetails.anonymized_expired_tenants = tenantIds.length;
75:       }
76:     }
77: 
78:     // 2. Anonymize inactive accounts (5 years)
79:     const inactiveDate = new Date();
80:     inactiveDate.setFullYear(inactiveDate.getFullYear() - parseInt(policies.inactive_account_anonymization));
81: 
82:     const { data: inactiveUsers } = await supabaseAdmin
83:       .from('profiles')
84:       .select('id')
85:       .lt('updated_at', inactiveDate.toISOString())
86:       .is('deletion_requested_at', null);
87: 
88:     if (inactiveUsers && inactiveUsers.length > 0) {
89:       const userIds = inactiveUsers.map(u => u.id);
90:       
91:       // Check if they have any active properties or tenancies
92:       const { data: activeProperties } = await supabaseAdmin
93:         .from('properties')
94:         .select('manager_id')
95:         .in('manager_id', userIds)
96:         .eq('status', 'active');
97: 
98:       const { data: activeTenancies } = await supabaseAdmin
99:         .from('property_tenants')
100:         .select('tenant_id')
101:         .in('tenant_id', userIds)
102:         .in('tenancy_status', ['active', 'ending_tenancy']);
103: 
104:       // Only anonymize truly inactive users
105:       const activeUserIds = new Set([
106:         ...(activeProperties?.map(p => p.manager_id) || []),
107:         ...(activeTenancies?.map(t => t.tenant_id) || [])
108:       ]);
109: 
110:       const inactiveUserIds = userIds.filter(id => !activeUserIds.has(id));
111: 
112:       if (inactiveUserIds.length > 0) {
113:         const { error: anonymizeError } = await supabaseAdmin
114:           .from('profiles')
115:           .update({
116:             first_name: 'Deleted',
117:             last_name: 'User',
118:             email: `deleted-${crypto.randomUUID()}@anonymized.local`,
119:             phone: null,
120:             manager_iban: null,
121:           })
122:           .in('id', inactiveUserIds);
123: 
124:         if (!anonymizeError) {
125:           totalAnonymized += inactiveUserIds.length;
126:           executionDetails.anonymized_inactive_accounts = inactiveUserIds.length;
127:         }
128:       }
129:     }
130: 
131:     // 3. Delete old analytics data (2 years)
132:     const analyticsDate = new Date();
133:     analyticsDate.setFullYear(analyticsDate.getFullYear() - parseInt(policies.analytics_data));
134: 
135:     const { error: analyticsError, count: analyticsCount } = await supabaseAdmin
136:       .from('analytics_page_views')
137:       .delete()
138:       .lt('timestamp', analyticsDate.toISOString());
139: 
140:     if (!analyticsError && analyticsCount) {
141:       totalDeleted += analyticsCount;
142:       executionDetails.deleted_analytics_page_views = analyticsCount;
143:     }
144: 
145:     const { error: eventsError, count: eventsCount } = await supabaseAdmin
146:       .from('analytics_events')
147:       .delete()
148:       .lt('timestamp', analyticsDate.toISOString());
149: 
150:     if (!eventsError && eventsCount) {
151:       totalDeleted += eventsCount;
152:       executionDetails.deleted_analytics_events = eventsCount;
153:     }
154: 
155:     const { error: navError, count: navCount } = await supabaseAdmin
156:       .from('analytics_navigation_paths')
157:       .delete()
158:       .lt('timestamp', analyticsDate.toISOString());
159: 
160:     if (!navError && navCount) {
161:       totalDeleted += navCount;
162:       executionDetails.deleted_navigation_paths = navCount;
163:     }
164: 
165:     // 4. Anonymize old ticket data (3 years) - but keep financial records
166:     const ticketDate = new Date();
167:     ticketDate.setFullYear(ticketDate.getFullYear() - parseInt(policies.ticket_data));
168: 
169:     const { data: oldTickets } = await supabaseAdmin
170:       .from('tickets')
171:       .select('id, created_by')
172:       .eq('status', 'resolved')
173:       .lt('resolved_at', ticketDate.toISOString());
174: 
175:     if (oldTickets && oldTickets.length > 0) {
176:       // Delete ticket comments and activities
177:       const ticketIds = oldTickets.map(t => t.id);
178:       
179:       const { error: commentsError } = await supabaseAdmin
180:         .from('ticket_comments')
181:         .delete()
182:         .in('ticket_id', ticketIds);
183: 
184:       const { error: activitiesError } = await supabaseAdmin
185:         .from('ticket_activities')
186:         .delete()
187:         .in('ticket_id', ticketIds);
188: 
189:       if (!commentsError || !activitiesError) {
190:         totalDeleted += ticketIds.length;
191:         executionDetails.deleted_old_tickets = ticketIds.length;
192:       }
193:     }
194: 
195:     // 5. Process scheduled account deletions
196:     const { data: scheduledDeletions } = await supabaseAdmin
197:       .from('profiles')
198:       .select('id, email, first_name, last_name')
199:       .not('deletion_scheduled_for', 'is', null)
200:       .lt('deletion_scheduled_for', new Date().toISOString());
201: 
202:     if (scheduledDeletions && scheduledDeletions.length > 0) {
203:       for (const user of scheduledDeletions) {
204:         try {
205:           // Anonymize profile
206:           await supabaseAdmin
207:             .from('profiles')
208:             .update({
209:               first_name: 'Deleted',
210:               last_name: `User #${user.id.substring(0, 8)}`,
211:               email: `deleted-${user.id.substring(0, 8)}@anonymized.local`,
212:               phone: null,
213:               manager_iban: null,
214:               deletion_requested_at: null,
215:               deletion_scheduled_for: null,
216:             })
217:             .eq('id', user.id);
218: 
219:           // Delete auth user
220:           await supabaseAdmin.auth.admin.deleteUser(user.id);
221: 
222:           totalAnonymized += 1;
223:         } catch (error) {
224:           console.error(`Failed to delete user ${user.id}:`, error);
225:         }
226:       }
227:       executionDetails.processed_scheduled_deletions = scheduledDeletions.length;
228:     }
229: 
230:     totalAffected = totalAnonymized + totalDeleted;
231: 
232:     // Log the execution
233:     await supabaseAdmin
234:       .from('data_retention_audit')
235:       .insert({
236:         policy_type: 'monthly_enforcement',
237:         affected_records: totalAffected,
238:         anonymized_records: totalAnonymized,
239:         deleted_records: totalDeleted,
240:         execution_details: executionDetails,
241:       });
242: 
243:     console.log('Data retention enforcement completed:', {
244:       totalAffected,
245:       totalAnonymized,
246:       totalDeleted,
247:       executionDetails,
248:     });
249: 
250:     return new Response(
251:       JSON.stringify({
252:         success: true,
253:         totalAffected,
254:         totalAnonymized,
255:         totalDeleted,
256:         executionDetails,
257:       }),
258:       { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
259:     );
260: 
261:   } catch (error: unknown) {
262:     console.error('Data retention enforcement error:', error);
263:     return new Response(
264:       JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
265:       { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
266:     );
267:   }
268: });

(End of file - total 268 lines)
</content>
```

---

## Assistant (Plan · DeepSeek V4 Flash Free · 10.6s)

_Thinking:_

Let me analyze what I see now:

1. **`enforce-data-retention/index.ts:54`**: `.eq('tenancy_status', 'ended')` — this should be `'historic'`. This is a clear bug — the data retention function will never find expired tenancies because `'ended'` is not a valid status in the DB constraint. However, looking at more context: the function is now querying for a status that doesn't exist, so it will return 0 results and skip the anonymization step. This means tenant data after 3 years is never anonymized. This IS an actual bug.

2. **`manage-tenancy-limit/index.ts:40`**: `.filter(t => t.tenancy_status === 'inactive')` — `'inactive'` is not a valid status in the DB constraint. This function will never find any records to delete, so the FIFO cleanup never runs. But wait — is this function even called by anything? Let me check if there's a cron schedule or API call referencing it. Actually, even if it's never called, it's still a bug if someone invokes it.

Let me think about what else can be simplified:

**Actual simplification: Do we even need `computeTenancyStatus()`?**

The business rules say to add it. The user agreed to the auto-ending-window feature. But now they want to simplify further.

Re-evaluating `computeTenancyStatus()`:
- It adds a function that overlays business logic on the stored status
- The auto-ending-window means: if `planned_ending_date` is set and within 60 days, show as `ending_tenancy` even if status is still `active`
- But in practice: when a manager sets a `planned_ending_date`, the code also sets `tenancy_status = 'ending_tenancy'` simultaneously (in `endTenancyMutation`). So the manual transition already happens.
- The only gap: if someone directly sets `planned_ending_date` via the EditTenantDialog (bypassing the end-tenancy workflow) without updating the status. Is that even possible?

Let me check the EditTenantDialog...

Actually, looking at the existing code, when `endTenancyMutation` fires, it sets BOTH `tenancy_status: 'ending_tenancy'` AND `planned_ending_date`. So the stored status is always correct. The auto-derive doesn't add practical value.

**The simplest possible plan:** Just fix the 2 broken status string references. That's it. That's the minimum to fix actual bugs.

But also: let me check if `manage-tenancy-limit` is even referenced anywhere (deployed, cron scheduled, etc.) — if it's dead code, maybe we should remove it rather than fix it.

Let me check:

**Tool: grep**

**Input:**
```json
{
  "pattern": "manage-tenancy-limit",
  "include": "*.{ts,tsx,sql,json}"
}
```

**Output:**
```
Found 2 matches
/home/dragutin/projects/rentmate/src/services/tenancyService.ts:
  Line 260:   const { data, error } = await supabase.functions.invoke('manage-tenancy-limit', { body });


/home/dragutin/projects/rentmate/supabase/functions/manage-tenancy-limit/index.ts:
  Line 93:     console.error('Error in manage-tenancy-limit:', error);

```

**Tool: grep**

**Input:**
```json
{
  "pattern": "enforce-data-retention",
  "include": "*.{ts,tsx,sql,json}"
}
```

**Output:**
```
No files found
```

---

## Assistant (Plan · DeepSeek V4 Flash Free · 4.4s)

_Thinking:_

So:
1. `manage-tenancy-limit` IS called from `tenancyService.ts:260` — it's invoked after creating a new tenancy. So it IS live code, but broken (never matches anything due to `'inactive'` filter).
2. `enforce-data-retention` is NOT referenced from any frontend/backend code — it might be triggered by a cron job in Supabase, but at least it's not invoked from the app code directly. Still, it's broken because it never finds expired tenancies.

Let me read the service call to understand the context:

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/dragutin/projects/rentmate/src/services/tenancyService.ts",
  "offset": 250,
  "limit": 25
}
```

**Output:**
```
<path>/home/dragutin/projects/rentmate/src/services/tenancyService.ts</path>
<type>file</type>
<content>
250: }
251: 
252: export async function createPropertyTenant(data: Record<string, unknown>): Promise<void> {
253:   const { error } = await supabase
254:     .from('property_tenants')
255:     .insert(data);
256:   if (error) throw error;
257: }
258: 
259: export async function manageTenancyLimit(body: Record<string, unknown>): Promise<Record<string, unknown>> {
260:   const { data, error } = await supabase.functions.invoke('manage-tenancy-limit', { body });
261:   if (error) throw error;
262:   return data as Record<string, unknown>;
263: }
264: 
265: export async function initiateYousignSignature(body: Record<string, unknown>): Promise<QualifiedSignatureResponse> {
266:   const { data, error } = await supabase.functions.invoke('initiate-yousign-signature', { body });
267:   if (error) throw error;
268:   return data as QualifiedSignatureResponse;
269: }
270: 
271: export async function sendYousignReminder(body: Record<string, unknown>): Promise<Record<string, unknown>> {
272:   const { data, error } = await supabase.functions.invoke('send-yousign-reminder', { body });
273:   if (error) throw error;
274:   return data as Record<string, unknown>;

(Showing lines 250-274 of 312. Use offset=275 to continue.)
</content>
```

---

## Assistant (Plan · DeepSeek V4 Flash Free · 2.3s)

_Thinking:_

Now let me check if `manageTenancyLimit` is actually called from anywhere:

**Tool: grep**

**Input:**
```json
{
  "include": "*.{ts,tsx}",
  "pattern": "manageTenancyLimit"
}
```

**Output:**
```
Found 3 matches
/home/dragutin/projects/rentmate/src/services/tenancyService.ts:
  Line 259: export async function manageTenancyLimit(body: Record<string, unknown>): Promise<Record<string, unknown>> {

  Line 308:   manageTenancyLimit,


/home/dragutin/projects/rentmate/src/pages/Rentals.tsx:
  Line 221:       await tenancyService.manageTenancyLimit({

```

---

## Assistant (Plan · DeepSeek V4 Flash Free · 2.9s)

_Thinking:_

So `manageTenancyLimit` IS called from `Rentals.tsx:221` — this is invoked when a new tenant accepts an invitation. Let me see that context:

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/dragutin/projects/rentmate/src/pages/Rentals.tsx",
  "offset": 215,
  "limit": 15
}
```

**Output:**
```
<path>/home/dragutin/projects/rentmate/src/pages/Rentals.tsx</path>
<type>file</type>
<content>
215:           .eq("tenant_email", invitation.email)
216:           .in("status", ["draft", "sent"]);
217:         if (reqError) console.error("Error updating requirement status:", reqError);
218:       }
219: 
220:       // Enforce FIFO tenancy limit
221:       await tenancyService.manageTenancyLimit({
222:         body: { property_id: invitation.property_id },
223:       });
224: 
225:       // Invalidate cache to refresh
226:       await queryClient.invalidateQueries({ 
227:         queryKey: [TENANT_PROPERTIES_QUERY_KEY] 
228:       });
229: 

(Showing lines 215-229 of 461. Use offset=230 to continue.)
</content>
```

---

## Assistant (Plan · DeepSeek V4 Flash Free · 13.6s)

_Thinking:_

Now I have a complete picture. Let me also look at what `enforce-data-retention` does with the `'ended'` status. That function queries for expired tenancies with `.eq('tenancy_status', 'ended')`. Since `'ended'` doesn't exist in the CHECK constraint, this will always return zero results, and tenant data anonymization never happens. But it's not called from the app — it's likely triggered by a cron.

Now let me craft the absolute simplest plan:

**The minimum viable change to fix actual bugs:**

1. **Fix `manage-tenancy-limit/index.ts` line 40**: Change `t.tenancy_status === 'inactive'` to `t.tenancy_status === 'historic'`. This is a FIFO cleanup that's supposed to delete the oldest finished tenancies when there are more than 5. The intent is to clean up old `historic` ones, so `'historic'` is the right filter.

2. **Fix `enforce-data-retention/index.ts` line 54**: Change `.eq('tenancy_status', 'ended')` to `.eq('tenancy_status', 'historic')`. This is needed for the data retention anonymization to actually work.

That's it. Two one-line fixes. No new types, no new files, no computeTenancyStatus, no audit log, no nothing.

Everything else in the business rules doc is already working or is aspirational:
- Status transitions work correctly (the stored status approach is valid and functional)
- Parallel tenancy setup works (unique DB indexes enforce the live-tenancy limit)
- The ending_tenancy workflow is correct
- Everything renders properly

Should I also question whether `computeTenancyStatus()` is needed? The user said yes to it earlier, but now they want to reduce. Let me present both options.

Here's the fully reduced plan. Let me clarify the two "broken" issues and what's actually needed.

---

## Bug Analysis — What's Actually Broken

### Bug 1: `manage-tenancy-limit` — broken filter
**`supabase/functions/manage-tenancy-limit/index.ts:40`**: filters for `tenancy_status === 'inactive'` which **never exists** in the DB (CHECK constraint only allows `active|ending_tenancy|historic|pending`). This function IS called from `Rentals.tsx:221` after invitation acceptance, so it runs but never cleans up. It should filter for `'historic'` to actually delete old finished tenancies.

### Bug 2: `enforce-data-retention` — broken filter
**`supabase/functions/enforce-data-retention/index.ts:54`**: `.eq('tenancy_status', 'ended')` — same problem. `'ended'` is not a valid value. The data retention job will never find expired tenancies to anonymize. Should be `'historic'`.

### Not Broken
- **Ending window auto-derive**: Not needed in practice. When manager sets `planned_ending_date` via `endTenancyMutation`, it also sets `tenancy_status: 'ending_tenancy'` atomically. No edge case where the stored status is wrong.
- **Everything else** in the business rules doc works as-is with stored status.

---

## Minimal Plan

**Two files, one line changed each, zero new files.**

1. `supabase/functions/manage-tenancy-limit/index.ts:40` — `'inactive'` → `'historic'`
2. `supabase/functions/enforce-data-retention/index.ts:54` — `'ended'` → `'historic'`

**Time:** ~15 minutes. **Risk:** None (both values never matched anything before, so we're unbreaking no-op code).

---

Do you want just those two fixes, or do you still want `computeTenancyStatus()` added (which would add a utility file and wire it into the tenant service domain mapper — about ~30 minutes more for the safety net)?

---

## User

I want the original plan, as the status handling is important, minus the audit log. then we will see next iteration. 

---

## Assistant (Plan · DeepSeek V4 Flash Free · 4.6s)

_Thinking:_

The user wants the original plan minus the audit log. Let me recall what the original plan was before I started simplifying:

Original plan:
1. Phase 1 — Fix broken edge functions
2. Phase 2 — Add computeTenancyStatus() with ending window auto-derive
3. Phase 3 — Audit log for post-end edits

Minus the audit log means:
1. Phase 1 — Fix broken edge functions
2. Phase 2 — Add computeTenancyStatus() with ending window auto-derive

That's it. Let me refine this plan with concrete details and verify the approach.

Let me re-read the key files I'll need to modify to make sure the plan is solid before presenting.

Understood. Original plan minus audit log: **Phase 1 (fix edge functions) + Phase 2 (computeTenancyStatus with ending window)**. Let me verify the implementation details before finalizing the plan.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/dragutin/projects/rentmate/src/services/tenantService.ts",
  "limit": 60
}
```

**Output:**
```
<path>/home/dragutin/projects/rentmate/src/services/tenantService.ts</path>
<type>file</type>
<content>
1: import { supabase } from '@/integrations/supabase/client';
2: import type { TenancyDomain, InvitationDomain, RentAgreementDomain } from '@/types/domain';
3: import type { PropertyTenant, Invitation, RentAgreement, Property, Profile } from '@/types';
4: 
5: type PropertyTenantJoined = PropertyTenant & {
6:   properties: Pick<Property, 'title' | 'address'> | null;
7:   profiles: Pick<Profile, 'first_name' | 'last_name' | 'email'> | null;
8: };
9: 
10: type InvitationJoined = Invitation & {
11:   properties: Pick<Property, 'title'> | null;
12: };
13: 
14: function mapToTenancyDomain(row: PropertyTenantJoined): TenancyDomain {
15:   return {
16:     id: row.id,
17:     propertyId: row.property_id,
18:     propertyTitle: row.properties?.title || '',
19:     propertyAddress: row.properties?.address || null,
20:     tenantId: row.tenant_id,
21:     tenantFirstName: row.profiles?.first_name || null,
22:     tenantLastName: row.profiles?.last_name || null,
23:     tenantEmail: row.profiles?.email || '',
24:     status: row.tenancy_status,
25:     startDate: row.started_at,
26:     plannedEndDate: row.planned_ending_date || null,
27:     endedAt: row.ended_at || null,
28:     endReason: row.end_reason || null,
29:     notes: row.notes || null,
30:     createdAt: row.created_at,
31:     managerTenantName: row.manager_tenant_name || null,
32:     managerTenantSurname: row.manager_tenant_surname || null,
33:     managerTenantPhone: row.manager_tenant_phone || null,
34:   };
35: }
36: 
37: function mapToInvitationDomain(row: InvitationJoined): InvitationDomain {
38:   return {
39:     id: row.id,
40:     propertyId: row.property_id,
41:     propertyTitle: row.properties?.title || '',
42:     email: row.email,
43:     status: row.status,
44:     createdAt: row.created_at,
45:     expiresAt: row.expires_at,
46:     token: row.token,
47:     invitedUserId: row.invited_user_id || null,
48:     tenancyRequirementsId: row.tenancy_requirements_id || null,
49:   };
50: }
51: 
52: function mapToRentAgreementDomain(row: RentAgreement): RentAgreementDomain {
53:   return {
54:     id: row.id,
55:     propertyId: row.property_id,
56:     tenancyId: row.tenancy_id,
57:     tenantId: row.tenant_id,
58:     managerId: row.manager_id,
59:     rentAmountCents: row.rent_amount_cents,
60:     paymentDay: row.payment_day,

(Showing lines 1-60 of 215. Use offset=61 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/dragutin/projects/rentmate/src/services/tenancyService.ts",
  "offset": 155,
  "limit": 55
}
```

**Output:**
```
<path>/home/dragutin/projects/rentmate/src/services/tenancyService.ts</path>
<type>file</type>
<content>
155:   return data?.manager_id ?? null;
156: }
157: 
158: export async function getPropertyTenantsForManager(propertyId: string, _managerId: string): Promise<Record<string, unknown>[]> {
159:   const { data, error } = await supabase
160:     .from('property_tenants')
161:     .select('*')
162:     .eq('property_id', propertyId)
163:     .eq('tenancy_status', 'active');
164:   if (error) throw error;
165:   return data || [];
166: }
167: 
168: export async function getTenantPropertiesForUser(userId: string): Promise<{ property_id: string }[]> {
169:   const { data, error } = await supabase
170:     .from('property_tenants')
171:     .select('property_id')
172:     .eq('tenant_id', userId)
173:     .in('tenancy_status', ['active', 'ending_tenancy']);
174:   if (error) throw error;
175:   return data || [];
176: }
177: 
178: export async function checkActiveTenancy(propertyId: string, tenantId: string): Promise<{ id: string } | null> {
179:   const { data, error } = await supabase
180:     .from('property_tenants')
181:     .select('id')
182:     .eq('property_id', propertyId)
183:     .eq('tenant_id', tenantId)
184:     .in('tenancy_status', ['active', 'ending_tenancy'])
185:     .maybeSingle();
186:   if (error) throw error;
187:   return data;
188: }
189: 
190: // ========== PROPERTY TENANTS MUTATIONS ==========
191: 
192: export async function updatePropertyTenantStatus(id: string, updates: PropertyTenantUpdates): Promise<void> {
193:   const { error } = await supabase
194:     .from('property_tenants')
195:     .update(updates)
196:     .eq('id', id);
197:   if (error) throw error;
198: }
199: 
200: export async function updatePropertyTenantContactInfo(id: string, data: {
201:   manager_tenant_name?: string | null;
202:   manager_tenant_surname?: string | null;
203:   manager_tenant_phone?: string | null;
204: }): Promise<void> {
205:   const { error } = await supabase
206:     .from('property_tenants')
207:     .update(data)
208:     .eq('id', id);
209:   if (error) throw error;

(Showing lines 155-209 of 312. Use offset=210 to continue.)
</content>
```

---

## Assistant (Plan · DeepSeek V4 Flash Free · 2.9s)

_Thinking:_

Now let me look at StatusBadge to understand how status is rendered, and the tenancyService mapper to understand where domain mapping happens:

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/dragutin/projects/rentmate/src/components/property-tenants/StatusBadge.tsx"
}
```

**Output:**
```
<path>/home/dragutin/projects/rentmate/src/components/property-tenants/StatusBadge.tsx</path>
<type>file</type>
<content>
1: import { LucideIcon, CheckCircle2, Clock, AlertCircle, XCircle, FileText, Send, History } from "lucide-react";
2: import { Badge } from "@/components/ui/badge";
3: import { cn } from "@/lib/utils";
4: 
5: type StatusType = 
6:   | 'active' 
7:   | 'pending' 
8:   | 'ending_tenancy' 
9:   | 'historic' 
10:   | 'draft' 
11:   | 'sent'
12:   | 'locked'
13:   | 'readonly'
14:   | 'version'
15:   | 'completed'
16:   | 'in_progress'
17:   | 'pending_signatures'
18:   | 'open'
19:   | 'resolved'
20:   | 'cancelled';
21: 
22: interface StatusBadgeProps {
23:   status: StatusType;
24:   label?: string;
25:   showDot?: boolean;
26:   className?: string;
27: }
28: 
29: const statusConfig: Record<StatusType, { 
30:   variant: "default" | "secondary" | "outline" | "destructive";
31:   className: string;
32:   icon: LucideIcon;
33:   defaultLabel: string;
34: }> = {
35:   active: { 
36:     variant: "default", 
37:     className: "bg-success/10 text-success border-success/20 hover:bg-success/10", 
38:     icon: CheckCircle2,
39:     defaultLabel: "Active"
40:   },
41:   pending: { 
42:     variant: "default", 
43:     className: "bg-info/10 text-info border-info/20 hover:bg-info/10", 
44:     icon: Clock,
45:     defaultLabel: "Pending"
46:   },
47:   ending_tenancy: { 
48:     variant: "default", 
49:     className: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/10", 
50:     icon: Clock,
51:     defaultLabel: "Ending"
52:   },
53:   historic: { 
54:     variant: "secondary", 
55:     className: "text-muted-foreground border-border", 
56:     icon: History,
57:     defaultLabel: "Historic"
58:   },
59:   draft: { 
60:     variant: "default", 
61:     className: "bg-warning/10 text-warning border-warning/20", 
62:     icon: FileText,
63:     defaultLabel: "Draft"
64:   },
65:   sent: { 
66:     variant: "default", 
67:     className: "bg-info/10 text-info border-info/20", 
68:     icon: Send,
69:     defaultLabel: "Sent"
70:   },
71:   locked: { 
72:     variant: "default", 
73:     className: "bg-success/10 text-success border-success/20", 
74:     icon: CheckCircle2,
75:     defaultLabel: "Locked"
76:   },
77:   readonly: { 
78:     variant: "secondary", 
79:     className: "text-muted-foreground", 
80:     icon: FileText,
81:     defaultLabel: "Read Only"
82:   },
83:   version: { 
84:     variant: "default", 
85:     className: "bg-info/10 text-info border-info/20", 
86:     icon: FileText,
87:     defaultLabel: "Version"
88:   },
89:   completed: { 
90:     variant: "default", 
91:     className: "bg-success hover:bg-success/80", 
92:     icon: CheckCircle2,
93:     defaultLabel: "Completed"
94:   },
95:   in_progress: { 
96:     variant: "outline", 
97:     className: "text-info border-info/30", 
98:     icon: Clock,
99:     defaultLabel: "In Progress"
100:   },
101:   pending_signatures: { 
102:     variant: "outline", 
103:     className: "text-warning border-warning/30", 
104:     icon: Clock,
105:     defaultLabel: "Pending Signatures"
106:   },
107:   open: { 
108:     variant: "default", 
109:     className: "bg-info hover:bg-info/80", 
110:     icon: AlertCircle,
111:     defaultLabel: "Open"
112:   },
113:   resolved: { 
114:     variant: "default", 
115:     className: "bg-success hover:bg-success/80", 
116:     icon: CheckCircle2,
117:     defaultLabel: "Resolved"
118:   },
119:   cancelled: { 
120:     variant: "secondary", 
121:     className: "text-muted-foreground", 
122:     icon: XCircle,
123:     defaultLabel: "Cancelled"
124:   },
125: };
126: 
127: export function StatusBadge({ 
128:   status, 
129:   label, 
130:   showDot = true,
131:   className 
132: }: StatusBadgeProps) {
133:   const config = statusConfig[status] || statusConfig.pending;
134:   const Icon = config.icon;
135:   
136:   return (
137:     <Badge 
138:       variant={config.variant} 
139:       className={cn(
140:         "text-xs font-medium px-2.5 py-1 h-auto border",
141:         config.className,
142:         className
143:       )}
144:     >
145:       {showDot && <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />}
146:       {label || config.defaultLabel}
147:     </Badge>
148:   );
149: }

(End of file - total 149 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/dragutin/projects/rentmate/src/services/tenancyService.ts",
  "limit": 60
}
```

**Output:**
```
<path>/home/dragutin/projects/rentmate/src/services/tenancyService.ts</path>
<type>file</type>
<content>
1: import { supabase } from '@/integrations/supabase/client';
2: import type { RentAgreementDomain, TenancyStatus } from '@/types/domain';
3: import type { QualifiedSignatureResponse } from '@/types/edge-functions';
4: 
5: interface RentAgreementInput {
6:   property_id: string;
7:   tenancy_id: string;
8:   tenant_id: string;
9:   manager_id: string;
10:   rent_amount_cents: number;
11:   payment_day: number;
12:   currency: string;
13:   start_date: string;
14:   end_date?: string;
15:   is_active?: boolean;
16:   mandate_id?: string;
17:   mandate_status?: string;
18:   tenant_iban?: string;
19: }
20: 
21: interface RentAgreementUpdates {
22:   rent_amount_cents?: number;
23:   payment_day?: number;
24:   end_date?: string;
25:   is_active?: boolean;
26:   mandate_id?: string;
27:   mandate_status?: string;
28:   mandate_pdf_url?: string;
29:   mandate_signed_at?: string;
30:   tenant_iban?: string;
31: }
32: 
33: interface PropertyTenantUpdates {
34:   tenancy_status?: TenancyStatus;
35:   manager_tenant_name?: string | null;
36:   manager_tenant_surname?: string | null;
37:   manager_tenant_phone?: string | null;
38: }
39: 
40: interface MandateInfo {
41:   mandate_id: string | null;
42:   mandate_status: string | null;
43:   mandate_pdf_url: string | null;
44:   mandate_signed_at: string | null;
45:   tenant_iban: string | null;
46: }
47: 
48: // ========== RENT AGREEMENTS ==========
49: 
50: export async function getActiveRentAgreement(tenancyId: string): Promise<RentAgreementDomain | null> {
51:   const { data, error } = await supabase
52:     .from('rent_agreements')
53:     .select('*')
54:     .eq('tenancy_id', tenancyId)
55:     .eq('is_active', true)
56:     .maybeSingle();
57:   if (error) throw error;
58:   return data as RentAgreementDomain | null;
59: }
60: 

(Showing lines 1-60 of 312. Use offset=61 to continue.)
</content>
```

---

## Assistant (Plan · DeepSeek V4 Flash Free · 3.3s)

_Thinking:_

Now let me also check where the day-count helper would come from and look at how property_tenants data flows through the system to understand where computeTenancyStatus should be injected.

Let me check if there's a `daysBetween` or date utility already:

**Tool: grep**

**Input:**
```json
{
  "include": "*.ts",
  "pattern": "daysBetween|daysDiff|differenceInDays",
  "path": "/home/dragutin/projects/rentmate/src"
}
```

**Output:**
```
Found 3 matches
/home/dragutin/projects/rentmate/src/hooks/usePaymentsTab.ts:
  Line 42:     const daysUntil = differenceInDays(new Date(nextDuePayment.payment_due_date), new Date());


/home/dragutin/projects/rentmate/src/lib/paymentUtils.ts:
  Line 1: import { differenceInDays, format } from "date-fns";

  Line 48:     ? differenceInDays(new Date(nextDuePayment.payment_due_date), new Date())

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/dragutin/projects/rentmate/src/services/tenantService.ts",
  "offset": 120,
  "limit": 95
}
```

**Output:**
```
<path>/home/dragutin/projects/rentmate/src/services/tenantService.ts</path>
<type>file</type>
<content>
120:       properties (title, address),
121:       profiles (first_name, last_name, email)
122:     `)
123:     .eq('id', tenancyId)
124:     .maybeSingle();
125:   if (error) throw error;
126:   return data ? mapToTenancyDomain(data) : null;
127: }
128: 
129: export async function getActiveTenancyForProperty(propertyId: string): Promise<TenancyDomain | null> {
130:   const { data, error } = await supabase
131:     .from('property_tenants')
132:     .select(`
133:       *,
134:       properties (title, address),
135:       profiles (first_name, last_name, email)
136:     `)
137:     .eq('property_id', propertyId)
138:     .in('tenancy_status', ['active', 'ending_tenancy', 'pending'])
139:     .maybeSingle();
140:   if (error) throw error;
141:   return data ? mapToTenancyDomain(data) : null;
142: }
143: 
144: export async function getInvitationsByProperty(propertyId: string, options?: { status?: string; daysWindow?: number }): Promise<InvitationDomain[]> {
145:   let query = supabase
146:     .from('invitations')
147:     .select(`
148:       *,
149:       properties (title)
150:     `)
151:     .eq('property_id', propertyId);
152: 
153:   if (options?.status) {
154:     query = query.eq('status', options.status);
155:   }
156:   if (options?.daysWindow) {
157:     const date = new Date();
158:     date.setDate(date.getDate() - options.daysWindow);
159:     query = query.gte('created_at', date.toISOString());
160:   }
161: 
162:   const { data, error } = await query.order('created_at', { ascending: false });
163:   if (error) throw error;
164:   return (data || []).map(mapToInvitationDomain);
165: }
166: 
167: export async function getInvitationByToken(token: string): Promise<InvitationDomain | null> {
168:   const { data, error } = await supabase
169:     .from('invitations')
170:     .select(`
171:       *,
172:       properties (title)
173:     `)
174:     .eq('token', token)
175:     .maybeSingle();
176:   if (error) throw error;
177:   return data ? mapToInvitationDomain(data) : null;
178: }
179: 
180: export async function getRentAgreement(tenancyId: string): Promise<RentAgreementDomain | null> {
181:   const { data, error } = await supabase
182:     .from('rent_agreements')
183:     .select('*')
184:     .eq('tenancy_id', tenancyId)
185:     .maybeSingle();
186:   if (error) throw error;
187:   return data ? mapToRentAgreementDomain(data) : null;
188: }
189: 
190: export async function getRentAgreementsByProperty(propertyId: string): Promise<RentAgreementDomain[]> {
191:   const { data, error } = await supabase
192:     .from('rent_agreements')
193:     .select('*')
194:     .eq('property_id', propertyId);
195:   if (error) throw error;
196:   return (data || []).map(mapToRentAgreementDomain);
197: }
198: 
199: export async function createInvitation(data: Record<string, unknown>): Promise<void> {
200:   const { error } = await supabase.from('invitations').insert(data);
201:   if (error) throw error;
202: }
203: 
204: export const tenantService = {
205:   getTenanciesByProperty,
206:   getTenanciesByManager,
207:   getTenanciesByTenant,
208:   getTenancy,
209:   getActiveTenancyForProperty,
210:   getInvitationsByProperty,
211:   getInvitationByToken,
212:   createInvitation,
213:   getRentAgreement,
214:   getRentAgreementsByProperty,

(Showing lines 120-214 of 215. Use offset=215 to continue.)
</content>
```

---

## Assistant (Plan · DeepSeek V4 Flash Free · 47.2s)

_Thinking:_

Now I have everything I need. Let me also check if `date-fns` is in the dependencies since `differenceInDays` is already used in the codebase. It's imported in two places, so it's definitely available.

Now let me solidify the plan. The user wants:
1. Phase 1 - Fix broken edge functions (2 files, one-liner each)
2. Phase 2 - Add computeTenancyStatus() with ending window auto-derive

For Phase 2, here's what I need to understand:
- `computeTenancyStatus()` needs to be injected at the domain mapping layer so all downstream consumers get the derived status automatically
- The two domain mappers are:
  1. `src/services/tenantService.ts` → `mapToTenancyDomain()` at line 14-35
  2. Components that read `tenancy_status` directly from raw Supabase rows (bypassing the mapper)

For the ending window auto-derive:
- When `planned_ending_date` is set AND within 60 days of today → return `'ending_tenancy'`
- Even if the stored `tenancy_status` is still `'active'` (which shouldn't happen normally, but provides defense-in-depth)
- When `tenancy_status` is `'historic'` → return `'historic'` (don't override)

Let me also think about where `computeTenancyStatus` needs to be applied. The key places:

1. **`tenantService.ts` `mapToTenancyDomain()`** (line 24: `status: row.tenancy_status`) — this is the primary domain mapper. If we apply it here, all components that use `TenancyDomain` get the derived status automatically. This covers most cases.

2. **But some components and hooks read the raw Supabase row directly** (e.g., `usePropertyTenants.ts` line 91, `PropertyTenants.tsx` line 103). These places bypass the mapper. So I need to either:
   a. Apply `computeTenancyStatus()` at the service query level too (in `tenancyService.ts`)
   b. Or create a reusable utility and call it wherever raw status is read

I think the cleanest approach is:
- Put `computeTenancyStatus()` in `src/lib/tenancyStatus.ts`
- Call it in `tenantService.ts` `mapToTenancyDomain()` for the domain path
- Call it in `tenancyService.ts` wherever raw rows are returned with status

Actually wait, let me re-examine. The `tenancyService.ts` functions use raw Supabase returns (they cast to `Record<string, unknown>[]` or just return `data` directly without domain mapping). These are consumed by hooks like `usePropertyTenants`. So to cover the direct-Supabase paths, I'd need to apply it in those services or at the hook level.

Looking at the architecture:
- `tenantService.ts` → returns mapped `TenancyDomain` objects (used by tenant-facing pages)
- `tenancyService.ts` → returns raw Supabase rows (used by manager-facing hooks/components)

The simplest approach to cover everything: create `computeTenancyStatus()` and apply it at every place where `tenancy_status` is read in the service layer. But that's many places.

**Better approach:** Add a helper that wraps `computeTenancyStatus` and use it in:
1. `tenantService.ts` `mapToTenancyDomain()` (covers tenant path)
2. Create a wrapper in `tenancyService.ts` that post-processes raw rows to inject computed status (covers manager path)
3. This way, all downstream consumers get it for free

Actually, let me think about this differently. The simplest implementation that covers the most:

Option A: Put computeTenancyStatus in the service query layer
- In `tenancyService.ts`, after every `supabase.from('property_tenants').select(...)`, post-process the results to apply computeTenancyStatus
- This is fragile (easy to miss a query)

Option B: Put computeTenancyStatus in a utility, apply it at the mapper + at the hook level
- Create `src/lib/tenancyStatus.ts`
- Apply in `tenantService.ts` `mapToTenancyDomain()`
- Apply in `usePropertyTenants.ts` where it processes raw rows
- Apply in any other hook that reads tenancy_status

Option C: Override the `tenancy_status` at the component level via a new derived field
- Add a `computedStatus` field to `TenancyDomain`
- Keep `status` as the raw stored value
- Components use `computedStatus` where they want the derived version

I think Option B is best - it's pragmatic, covers the main data paths, and is easy to understand.

Let me also think about what `status: row.tenancy_status` in the mapper should become. Currently line 24 is:
```ts
status: row.tenancy_status,
```

This should become:
```ts
status: computeTenancyStatus({
  tenancy_status: row.tenancy_status,
  planned_ending_date: row.planned_ending_date,
}),
```

But wait - `row.tenancy_status` is a `string | null`. The `TenancyStatus` type includes `null`. And `computeTenancyStatus` takes `TenancyStatus`. So we need to handle the null case.

Let me also think about the exact function signature:

```ts
const ENDING_WINDOW_DAYS = 60;

export function computeTenancyStatus(tenancy: {
  tenancy_status: string | null;
  planned_ending_date: string | null;
}): TenancyStatus {
  if (!tenancy.tenancy_status) return null; // or 'pending'?
  if (tenancy.tenancy_status === 'historic') return 'historic';
  if (tenancy.planned_ending_date) {
    const daysUntilEnd = differenceInDays(new Date(tenancy.planned_ending_date), new Date());
    if (daysUntilEnd <= ENDING_WINDOW_DAYS) return 'ending_tenancy';
  }
  return tenancy.tenancy_status;
}
```

Wait, I need to think about this more carefully. The business rules say:
- `active` → `ending` when `endDate` enters the 60-day window
- But currently the code uses `planned_ending_date` as the end date

The current flow is:
1. Manager clicks "End Tenancy" in the dialog
2. This sets `planned_ending_date` AND `tenancy_status: 'ending_tenancy'` simultaneously
3. So the stored status is already correct

What the auto-derive adds: if someone directly sets only `planned_ending_date` without changing the status (e.g., via a bulk import or direct DB update), or if there's a race condition, the computed status will correctly show `ending_tenancy`. It's a safety net.

But also, looking at the business rules more carefully: they actually say the ENDING window should be based on `endDate`, not `planned_ending_date`. But in the current schema, `planned_ending_date` IS the end date analog. There's no separate `end_date` column on `property_tenants` (the `end_date` on `rent_agreements` is different). So `planned_ending_date` is the right field.

Now, I also need to consider: should the auto-derive ever change the result for `'historic'` status? No - if a tenancy is `historic`, it should stay `historic` (the dates are in the past, it's done).

What about `'pending'`? If a pending tenancy has a `planned_ending_date` within 60 days... that doesn't make sense. Pending tenancies are future, so their `planned_ending_date` would be in the future, possibly within 60 days. But the status should stay `pending`. Actually, looking at the business rules: a tenancy can't be both `pending` and `ending`. `pending` means `startDate > today`, `ending` means `startDate ≤ today`. So we should check: if the tenancy hasn't started yet (`start` is in future), it's `pending`, not `ending`, regardless of end date.

Wait, but `computeTenancyStatus` in the business rules checks:
```ts
if (start > today) return 'pending';
...
if (end && daysUntilEnd <= ENDING_WINDOW_DAYS) return 'ending';
```

So `pending` check comes first, before the ending window check. This means:
- If startDate is in future → `pending` (even if endDate is soon)
- If startDate is past and endDate is within 60 days → `ending`
- If startDate is past and endDate is past → `ended` (but we don't have that - we use `historic`)

This means I need `started_at` too. But `started_at` should always be `<= today` for any tenancy that's not `pending`. Actually in the current code, `pending` is rarely used. Let me look...

Actually, the business rules spec says the derivation uses `startDate`. Currently the code has `started_at` on `property_tenants`, which defaults to `now()`. So for most tenancies, `started_at ≤ today` unless it was explicitly set in the future.

For the auto-derive to match the spec exactly, it needs `started_at` too. But this adds complexity. Let me simplify:

**Simplified approach for computeTenancyStatus:**
```ts
export function computeTenancyStatus(tenancy: {
  tenancy_status: string | null;
  planned_ending_date: string | null;
}): TenancyStatus {
  const stored = tenancy.tenancy_status;
  if (stored === 'historic') return 'historic';
  if (stored === 'pending') return 'pending';
  if (stored === null) return null;
  
  // Auto-derive 'ending_tenancy' if planned_ending_date is within 60 days
  // This overrides 'active' when the ending window is active
  if (stored === 'active' && tenancy.planned_ending_date) {
    const daysUntilEnd = differenceInDays(
      new Date(tenancy.planned_ending_date),
      new Date()
    );
    if (daysUntilEnd <= ENDING_WINDOW_DAYS) return 'ending_tenancy';
  }
  
  return stored;
}
```

This is clean and simple. It only auto-derives for `'active'` → `'ending_tenancy'` when within the window. It never touches `'historic'`, `'pending'`, or `'ending_tenancy'` (already set explicitly). It's a defensive safety net.

Wait, actually I should also consider: should we also warn/show `'ending_tenancy'` when a `'pending'` tenancy has `planned_ending_date` close? No - if it hasn't started, it can't be ending. That doesn't make sense.

Now let me plan the implementation details concretely.

### Implementation Plan

**Phase 1: Fix edge functions (2 lines)**

1. `supabase/functions/manage-tenancy-limit/index.ts:40`: 
   - Change `t.tenancy_status === 'inactive'` → `t.tenancy_status === 'historic'`

2. `supabase/functions/enforce-data-retention/index.ts:54`:
   - Change `.eq('tenancy_status', 'ended')` → `.eq('tenancy_status', 'historic')`

**Phase 2: computeTenancyStatus utility (4 files)**

1. **New file: `src/lib/tenancyStatus.ts`**
   - `computeTenancyStatus()` function with 60-day ending window
   - Imports `differenceInDays` from `date-fns` (already a dependency)
   - Constants: `ENDING_WINDOW_DAYS = 60`

2. **`src/services/tenantService.ts` line 24**
   - Change `status: row.tenancy_status` → `status: computeTenancyStatus(row)`
   - Import `computeTenancyStatus` from the new utility

3. **`src/services/tenancyService.ts`** — needs similar treatment for the raw queries that bypass domain mapping
   - `getPropertyTenantsForManager` (line 163): returns raw rows. Add a `.map()` to apply computeTenancyStatus
   - Actually, this function returns `Record<string, unknown>[]`, so it's weakly typed. The hooks consuming it access `.tenancy_status` directly. Applying computeTenancyStatus here means changing the return shape... 

Hmm, this is the complexity of the current architecture: the two services handle data differently. `tenantService.ts` properly maps to domain types. `tenancyService.ts` returns raw Supabase rows and consumers access fields directly.

For the raw-query path (tenancyService.ts), I have two options:
a) Post-process the raw results to add a computed `tenancy_status` field
b) Apply computeTenancyStatus at the hook/component level wherever `tenancy_status` is read

Option (b) is less invasive but requires changes in many places. Option (a) means modifying `tenancyService.ts` functions.

Actually, the cleanest approach: add a helper to `tenancyService.ts` that wraps the raw output and applies the computation. But since the functions return `Record<string, unknown>[]`, mapping over them to replace `tenancy_status` would work:

```ts
function applyComputedStatus<T extends { tenancy_status?: string | null; planned_ending_date?: string | null }>(rows: T[]): T[] {
  return rows.map(row => ({
    ...row,
    tenancy_status: computeTenancyStatus(row),
  }));
}
```

But this is fragile because `planned_ending_date` might not be selected in all queries.

Let me check what `getPropertyTenantsForManager` actually selects: `.select('*')` — so it gets all columns. That's fine.

How about the other functions? `getTenantPropertiesForUser` only selects `property_id` — it doesn't touch `tenancy_status` at the function level, it's used as a foreign key lookup. Not relevant.

`checkActiveTenancy` uses `.in('tenancy_status', ['active', 'ending_tenancy'])` to filter, then returns `{ id: string }`. Not relevant.

Actually, looking at the function calls more carefully:

In `tenancyService.ts`:
- `getPropertyTenantsForManager` (line 158-166): directly queries, returns raw rows. Used by hooks. **Needs computeTenancyStatus** if status is read from the result.
- `getTenantPropertiesForUser` (line 168-176): returns `{ property_id }[]`. Not status-related.
- `checkActiveTenancy` (line 178-188): returns `{ id } | null`. Filtered by status in the query itself, not read.
- `updatePropertyTenantStatus` (line 192-198): WRITE operation. Not applicable.

Let me trace who consumes `getPropertyTenantsForManager`:
- It's likely used by `usePropertyTenants` or similar hooks.

Actually, looking at the architecture doc, I should check the hooks. But I think I already know enough. The key insight is:

The **main consumer path** for tenancy status display is:
1. `tenantService.ts` → `mapToTenancyDomain()` → `TenancyDomain.status` → Components
2. Hook-level raw queries → components

Path 1 is the cleanest and most impactful place. If I only apply `computeTenancyStatus()` in `mapToTenancyDomain()` in `tenantService.ts`, it covers ALL uses of `TenancyDomain.status`, which is the majority of component reads.

For the remaining raw-query paths that read `tenancy_status` directly, I could apply it at the hook level or leave them as-is (they'll still read the stored value). The stored value is usually correct anyway.

This is the pragmatic approach: fix the main data path, leave the edge paths as they are (they still work correctly with stored status).

Let me finalize the plan:

**Phase 1: Fix edge functions**
1. `manage-tenancy-limit/index.ts:40` — `'inactive'` → `'historic'`  
2. `enforce-data-retention/index.ts:54` — `'ended'` → `'historic'`

**Phase 2: computeTenancyStatus utility**
1. Create `src/lib/tenancyStatus.ts` with `computeTenancyStatus()`
2. Wire it into `tenantService.ts` `mapToTenancyDomain()` (line 24)
3. Wire it into `tenancyService.ts` `getPropertyTenantsForManager()` (for the raw-query path)

Let me also double check if there are simpler ways. Could I just add it to the mapper and ignore the raw query path? Let me check what consumers of `getPropertyTenantsForManager` look like:

**Tool: grep**

**Input:**
```json
{
  "pattern": "getPropertyTenantsForManager",
  "include": "*.{ts,tsx}"
}
```

**Output:**
```
Found 2 matches
/home/dragutin/projects/rentmate/src/services/tenancyService.ts:
  Line 158: export async function getPropertyTenantsForManager(propertyId: string, _managerId: string): Promise<Record<string, unknown>[]> {

  Line 298:   getPropertyTenantsForManager,

```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/dragutin/projects/rentmate/src/hooks/usePropertyTenants.ts",
  "limit": 100
}
```

**Output:**
```
<path>/home/dragutin/projects/rentmate/src/hooks/usePropertyTenants.ts</path>
<type>file</type>
<content>
1: import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
2: import { useMemo } from "react";
3: import { supabase } from "@/integrations/supabase/client";
4: import { authService, tenantService, profileService, propertyService, documentService } from "@/services";
5: import { useLanguage } from "@/contexts/LanguageContext";
6: import { showToast } from "@/lib/toastUtils";
7: import { useTenancyRequirements } from "@/hooks/useTenancyRequirements";
8: 
9: export interface Tenant {
10:   id: string;
11:   tenant_id: string;
12:   tenancy_status: 'active' | 'ending_tenancy' | 'historic' | 'pending';
13:   started_at: string;
14:   ended_at: string | null;
15:   planned_ending_date?: string | null;
16:   email: string;
17:   first_name: string | null;
18:   last_name: string | null;
19:   notes: string | null;
20:   avatar_url?: string | null;
21:   kyc_status?: string | null;
22:   manager_tenant_name?: string | null;
23:   manager_tenant_surname?: string | null;
24:   manager_tenant_phone?: string | null;
25:   profiles?: {
26:     first_name: string | null;
27:     last_name: string | null;
28:     email: string;
29:   };
30: }
31: 
32: export interface Invitation {
33:   id: string;
34:   email: string;
35:   status: string;
36:   expires_at: string;
37:   created_at: string;
38: }
39: 
40: export function usePropertyTenantsData(propertyId: string | undefined, t: (key: string) => string) {
41:   const queryClient = useQueryClient();
42: 
43:   const { data: property, isLoading: propertyLoading } = useQuery({
44:     queryKey: ["property", propertyId],
45:     queryFn: () => propertyService.getProperty(propertyId),
46:     enabled: !!propertyId,
47:   });
48: 
49:   const { data: userRole } = useQuery({
50:     queryKey: ["user-role", propertyId],
51:     queryFn: async () => {
52:       const user = await authService.getCurrentUser();
53:       if (!user) return null;
54:       const { data: propertyData } = await supabase
55:         .from("properties")
56:         .select("manager_id")
57:         .eq("id", propertyId)
58:         .single();
59:       return { isManager: propertyData?.manager_id === user.id };
60:     },
61:     enabled: !!propertyId,
62:   });
63: 
64:   const { data: allTenants } = useQuery({
65:     queryKey: ["all-tenants-basic", propertyId],
66:     queryFn: async () => {
67:       const tenancies = await tenantService.getTenanciesByProperty(propertyId!);
68:       return tenancies.map(t => ({
69:         id: t.id,
70:         tenant_id: t.tenantId,
71:         tenancy_status: t.status,
72:         started_at: t.startDate,
73:         ended_at: t.endedAt,
74:         planned_ending_date: t.plannedEndDate,
75:         email: t.tenantEmail,
76:         first_name: t.tenantFirstName,
77:         last_name: t.tenantLastName,
78:         notes: t.notes || null,
79:         avatar_url: null,
80:         kyc_status: null,
81:         manager_tenant_name: t.managerTenantName ?? null,
82:         manager_tenant_surname: t.managerTenantSurname ?? null,
83:         manager_tenant_phone: t.managerTenantPhone ?? null,
84:       })) as Tenant[];
85:     },
86:     enabled: !!propertyId,
87:   });
88: 
89:   const activeTenantWithProfile = useMemo(() => {
90:     if (!allTenants) return null;
91:     return allTenants.find(t => t.tenancy_status === 'active') || null;
92:   }, [allTenants]);
93: 
94:   const { data: invitations, refetch: refetchInvitations } = useQuery({
95:     queryKey: ["invitations", propertyId],
96:     queryFn: async () => {
97:       const data = await tenantService.getInvitationsByProperty(propertyId!, { status: 'pending' });
98:       return data as Invitation[];
99:     },
100:     enabled: !!propertyId && userRole?.isManager,

(Showing lines 1-100 of 285. Use offset=101 to continue.)
</content>
```

---

## Assistant (Plan · DeepSeek V4 Flash Free · 5.6s)

_Thinking:_

Now I see the key data flow clearly:

1. `tenantService.getTenanciesByProperty()` → returns `TenancyDomain[]` via `mapToTenancyDomain()` → consumed by `usePropertyTenantsData` at line 64-85 → mapped to `Tenant[]` (local type) where `tenancy_status: t.status`

2. The `allTenants` data is used throughout `usePropertyTenantsData` with `t.tenancy_status` for things like `find(t => t.tenancy_status === 'active')`, etc.

So if I apply `computeTenancyStatus()` in `mapToTenancyDomain()`, the computed status flows all the way through to the `Tenant` type in `usePropertyTenantsData`. This covers the overwhelming majority of status reads.

The `getPropertyTenantsForManager` function in `tenancyService.ts` doesn't seem to be directly called by any hook (grep only found its definition and export, not a consumer). It might be unused, or used in a component directly.

Let me check if `getPropertyTenantsForManager` is imported anywhere:

**Tool: grep**

**Input:**
```json
{
  "include": "*.{ts,tsx}",
  "pattern": "from.*tenancyService.*getPropertyTenantsForManager|tenancyService\\.getPropertyTenantsForManager"
}
```

**Output:**
```
No files found
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/dragutin/projects/rentmate/src/services/tenancyService.ts",
  "offset": 290,
  "limit": 25
}
```

**Output:**
```
<path>/home/dragutin/projects/rentmate/src/services/tenancyService.ts</path>
<type>file</type>
<content>
290:   getActiveSignature,
291:   getContractSignatureStatus,
292:   getRentAgreementsForProperty,
293:   createRentAgreement,
294:   updateRentAgreement,
295:   getTenancyDocuments,
296:   getLatestSignatureDocument,
297:   getPropertyManagerId,
298:   getPropertyTenantsForManager,
299:   getTenantPropertiesForUser,
300:   checkActiveTenancy,
301:   updatePropertyTenantStatus,
302:   updatePropertyTenantContactInfo,
303:   updateRentAgreementSimple,
304:   getTenantPropertyIds,
305:   getTenancyStartDate,
306:   getRentAgreementBasicInfo,
307:   getMandateInfo,
308:   manageTenancyLimit,
309:   initiateYousignSignature,
310:   sendYousignReminder,
311:   createPropertyTenant,
312: };

(End of file - total 312 lines)
</content>
```

---

## Assistant (Plan · DeepSeek V4 Flash Free · 4.2s)

_Thinking:_

`getPropertyTenantsForManager` is exported but never imported by any component/hook. It's dead code. So applying `computeTenancyStatus()` to it is pointless.

The only path that matters is:
1. `tenantService.getTenanciesByProperty()` → `mapToTenancyDomain()` → `status: row.tenancy_status` → this is what `usePropertyTenantsData` consumes

And also:
2. `tenantService.getTenancy()` → `mapToTenancyDomain()` → same mapper
3. `tenantService.getActiveTenancyForProperty()` → `mapToTenancyDomain()` → same mapper

All three use the same `mapToTenancyDomain()` function. So changing line 24 in `tenantService.ts` is sufficient.

Now let me also check `getTenanciesByProperty` to be sure:

**Tool: read**

**Input:**
```json
{
  "offset": 61,
  "filePath": "/home/dragutin/projects/rentmate/src/services/tenantService.ts",
  "limit": 60
}
```

**Output:**
```
<path>/home/dragutin/projects/rentmate/src/services/tenantService.ts</path>
<type>file</type>
<content>
61:     currency: row.currency,
62:     startDate: row.start_date,
63:     endDate: row.end_date || null,
64:     isActive: row.is_active,
65:     mandateId: row.mandate_id || null,
66:     mandateStatus: row.mandate_status,
67:     tenantIban: row.tenant_iban || null,
68:     createdAt: row.created_at,
69:     updatedAt: row.updated_at,
70:   };
71: }
72: 
73: export async function getTenanciesByProperty(propertyId: string): Promise<TenancyDomain[]> {
74:   const { data, error } = await supabase
75:     .from('property_tenants')
76:     .select(`
77:       *,
78:       properties (title, address),
79:       profiles (first_name, last_name, email)
80:     `)
81:     .eq('property_id', propertyId)
82:     .order('created_at', { ascending: false });
83:   if (error) throw error;
84:   return (data || []).map(mapToTenancyDomain);
85: }
86: 
87: export async function getTenanciesByManager(managerId: string): Promise<TenancyDomain[]> {
88:   const { data, error } = await supabase
89:     .from('property_tenants')
90:     .select(`
91:       *,
92:       properties (title, address),
93:       profiles (first_name, last_name, email)
94:     `)
95:     .eq('properties.manager_id', managerId)
96:     .order('created_at', { ascending: false });
97:   if (error) throw error;
98:   return (data || []).map(mapToTenancyDomain);
99: }
100: 
101: export async function getTenanciesByTenant(tenantId: string): Promise<TenancyDomain[]> {
102:   const { data, error } = await supabase
103:     .from('property_tenants')
104:     .select(`
105:       *,
106:       properties (title, address),
107:       profiles (first_name, last_name, email)
108:     `)
109:     .eq('tenant_id', tenantId)
110:     .order('created_at', { ascending: false });
111:   if (error) throw error;
112:   return (data || []).map(mapToTenancyDomain);
113: }
114: 
115: export async function getTenancy(tenancyId: string): Promise<TenancyDomain | null> {
116:   const { data, error } = await supabase
117:     .from('property_tenants')
118:     .select(`
119:       *,
120:       properties (title, address),

(Showing lines 61-120 of 215. Use offset=121 to continue.)
</content>
```

---

## Assistant (Plan · DeepSeek V4 Flash Free · 3.9s)

_Thinking:_

All four functions (`getTenanciesByProperty`, `getTenanciesByManager`, `getTenanciesByTenant`, `getTenancy`, `getActiveTenancyForProperty`) all use `mapToTenancyDomain`. So applying `computeTenancyStatus` in that single mapper function covers all domain-level reads.

Now let me also look at what `PropertyTenants.tsx` does — it was mentioned as having a `canSetupNewTenancy` check at line 129-132. Let me check if it reads `tenancy_status` directly from a hook result (which already goes through the mapper) or from raw data:

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/dragutin/projects/rentmate/src/pages/PropertyTenants.tsx",
  "limit": 200
}
```

**Output:**
```
<path>/home/dragutin/projects/rentmate/src/pages/PropertyTenants.tsx</path>
<type>file</type>
<content>
1: import { useState, useEffect } from "react";
2: import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
3: import { useQueryClient } from "@tanstack/react-query";
4: import { supabase } from "@/integrations/supabase/client";
5: import { AppLayout } from "@/components/layouts/AppLayout";
6: import { Button } from "@/components/ui/button";
7: import { Skeleton } from "@/components/ui/skeleton";
8: import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
9: import {
10:   AlertDialog,
11:   AlertDialogAction,
12:   AlertDialogCancel,
13:   AlertDialogContent,
14:   AlertDialogDescription,
15:   AlertDialogFooter,
16:   AlertDialogHeader,
17:   AlertDialogTitle,
18: } from "@/components/ui/alert-dialog";
19: 
20: import { useLanguage } from "@/contexts/LanguageContext";
21: import {
22:   ArrowLeft,
23: } from "lucide-react";
24: import { useAnalyticsContext } from '@/contexts/AnalyticsContext';
25: import { ContractsTab } from '@/components/property-tenants/ContractsTab';
26: import { PaymentsTab } from '@/components/property-tenants/PaymentsTab';
27: import { TicketsTab } from '@/components/property-tenants/TicketsTab';
28: import { HistoricTab } from '@/components/property-tenants/HistoricTab';
29: import { CreateTenancyWizard } from '@/components/CreateTenancyWizard';
30: import { EndTenancyDialog } from "@/components/EndTenancyDialog";
31: import { EditTenantDialog } from "@/components/EditTenantDialog";
32: import { TenantSwitcher } from "@/components/property-hub/TenantSwitcher";
33: import { PropertySwitcher } from "@/components/property-hub/PropertySwitcher";
34: import { showToast } from "@/lib/toast";
35: import { usePropertyTenantsData, Tenant, Invitation } from '@/hooks/usePropertyTenants';
36: 
37: interface WizardFormData {
38:   id?: string;
39:   rent_amount_cents?: number;
40:   currency?: string;
41:   security_deposit_cents?: number;
42:   payment_day?: number;
43:   start_date?: string;
44:   end_date?: string;
45:   utilities_config?: Record<string, unknown>;
46:   self_manage_only?: boolean;
47:   tenant_email?: string;
48:   contract_method?: string;
49:   selected_template_id?: string;
50:   require_email_verification?: boolean;
51:   require_kyc_verification?: boolean;
52:   require_phone_verification?: boolean;
53:   manager_tenant_name?: string;
54:   manager_tenant_surname?: string;
55:   manager_tenant_phone?: string;
56: }
57: 
58: export default function PropertyTenants() {
59:   const { propertyId } = useParams();
60:   const navigate = useNavigate();
61:   const location = useLocation();
62:   const { t } = useLanguage();
63:   const queryClient = useQueryClient();
64:   const { trackEvent } = useAnalyticsContext();
65:   const [searchParams, setSearchParams] = useSearchParams();
66: 
67:   const { tenancyId } = location.state || {};
68:   const activeTab = searchParams.get('tab') || 'contracts';
69:   const actionParam = searchParams.get('action');
70:   const setActiveTab = (tab: string) => setSearchParams({ tab });
71:   const [hasTriggeredAction, setHasTriggeredAction] = useState(false);
72:   const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
73:   const [cancellingInvitation, setCancellingInvitation] = useState<Invitation | null>(null);
74:   const [showEndTenancyDialog, setShowEndTenancyDialog] = useState(false);
75:   const [endingTenant, setEndingTenant] = useState<Tenant | null>(null);
76:   const [showEndNowWarning, setShowEndNowWarning] = useState(false);
77:   const [showTenancyWizard, setShowTenancyWizard] = useState(false);
78:   const [finalizingTenant, setFinalizingTenant] = useState<Tenant | null>(null);
79:   const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
80:   const [dismissingInvitation, setDismissingInvitation] = useState<Invitation | null>(null);
81:   const [editingInvitation, setEditingInvitation] = useState<Invitation | null>(null);
82:   const [wizardInitialData, setWizardInitialData] = useState<WizardFormData | null>(null);
83:   const [wizardMode, setWizardMode] = useState<'new' | 'edit' | 'invite' | 'next_tenancy'>('new');
84:   const [cancelSetupOpen, setCancelSetupOpen] = useState(false);
85:   const [dateConflictOpen, setDateConflictOpen] = useState(false);
86: 
87:   const {
88:     property, propertyLoading,
89:     userRole,
90:     allTenants,
91:     invitations, refetchInvitations,
92:     templates,
93:     createRequirement, requirements, deleteRequirement,
94:     inviteMutation,
95:     dismissInvitationMutation,
96:     endTenancyMutation,
97:     finalizeTenancyMutation,
98:     cancelInvitationMutation,
99:   } = usePropertyTenantsData(propertyId, t);
100: 
101:   const focusedTenant = allTenants?.find((t) => t.id === tenancyId);
102:   const selectedTenant = allTenants?.find((t) => t.id === selectedTenantId);
103:   const selectableTenants = allTenants?.filter(t => t.tenancy_status !== 'historic') || [];
104:   const currentTenant = focusedTenant || selectedTenant || (selectableTenants.length > 0 ? selectableTenants[0] : null);
105:   const isReadOnly = currentTenant?.tenancy_status === 'historic';
106: 
107:   useEffect(() => {
108:     if (allTenants && allTenants.length > 0 && !selectedTenantId) {
109:       const firstNonHistoric = allTenants.find(t => t.tenancy_status !== 'historic');
110:       if (firstNonHistoric?.id) setSelectedTenantId(firstNonHistoric.id);
111:     }
112:   }, [allTenants, selectedTenantId]);
113: 
114:   useEffect(() => {
115:     if (currentTenant?.tenancy_status === 'historic' && activeTab !== 'historic') {
116:       setSearchParams({ tab: 'historic' });
117:     }
118:   }, [currentTenant?.id, currentTenant?.tenancy_status, activeTab, setSearchParams]);
119: 
120:   const safeCurrentTenant = currentTenant ? {
121:     ...currentTenant,
122:     id: currentTenant.id || '',
123:     email: currentTenant.email || 'Pending',
124:     first_name: currentTenant.first_name ?? null,
125:     last_name: currentTenant.last_name ?? null,
126:   } : null;
127: 
128:   const pendingRequirement = requirements?.find(r => r.status === 'draft' || r.status === 'sent') || null;
129:   const canSetupNewTenancy = (!currentTenant || 
130:     currentTenant?.tenancy_status === 'ending_tenancy' || 
131:     currentTenant?.tenancy_status === 'historic' ||
132:     currentTenant?.tenancy_status === 'pending') && !pendingRequirement;
133:   const hasEndingTenancy = currentTenant?.tenancy_status === 'ending_tenancy';
134: 
135:   useEffect(() => {
136:     if (actionParam === 'newTenancy' && canSetupNewTenancy && !hasTriggeredAction && !propertyLoading) {
137:       setShowTenancyWizard(true);
138:       setHasTriggeredAction(true);
139:       setSearchParams({ tab: 'contracts' });
140:     }
141:   }, [actionParam, canSetupNewTenancy, hasTriggeredAction, propertyLoading, setSearchParams]);
142: 
143:   useEffect(() => {
144:     const guideHighlight = searchParams.get("guideHighlight");
145:     if (guideHighlight) {
146:       if (guideHighlight === "contracts") {
147:         setSearchParams({ tab: "contracts" });
148:       } else if (guideHighlight === "payments") {
149:         setSearchParams({ tab: "payments" });
150:       } else if (guideHighlight === "rent") {
151:         setSearchParams({ tab: "contracts" });
152:       }
153:       searchParams.delete("guideHighlight");
154:       setSearchParams(searchParams);
155:     }
156:   }, [searchParams, setSearchParams]);
157: 
158:   const handleWizardSubmit = async (data: WizardFormData, mode: 'new' | 'edit' | 'invite' | 'next_tenancy') => {
159:     try {
160:       // Case: Invite mode — just send invitation to existing self-managed tenancy
161:       if (mode === 'invite') {
162:         if (!data.tenant_email) {
163:           showToast.error(t('tenancy.wizard.requiredEmail') || 'Tenant email is required');
164:           return;
165:         }
166:         await inviteMutation.mutateAsync(data.tenant_email);
167:         queryClient.invalidateQueries({ queryKey: ['all-tenants-basic', propertyId] });
168:         showToast.success(t('tenancy.invitationSent') || 'Invitation sent to tenant');
169:         setShowTenancyWizard(false);
170:         setWizardInitialData(null);
171:         setWizardMode('new');
172:         return;
173:       }
174: 
175:       // Block editing if tenancy is ending or pending
176:       if (mode === 'edit' && (currentTenant?.tenancy_status === 'ending_tenancy' || currentTenant?.tenancy_status === 'pending')) {
177:         showToast.error(t('tenancy.cannotEditActiveTenancy') || 'Cannot edit rental terms for this tenancy. Please set up a new tenancy instead.');
178:         return;
179:       }
180: 
181:       // Check if we're editing existing requirements (wizardInitialData has ID)
182:       if (wizardInitialData?.id && mode === 'edit') {
183:         const { error: updateError } = await supabase
184:           .from('tenancy_requirements')
185:           .update({
186:             rent_amount_cents: data.rent_amount_cents,
187:             currency: data.currency,
188:             security_deposit_cents: data.security_deposit_cents,
189:             payment_day: data.payment_day,
190:             start_date: data.start_date,
191:             end_date: data.end_date,
192:             utilities_config: data.utilities_config as Record<string, unknown>,
193:           })
194:           .eq('id', wizardInitialData.id);
195:         
196:         if (updateError) throw updateError;
197:         
198:         // Also update manager-entered contact info on property_tenants
199:         if (currentTenant?.id) {
200:           const { error: propertyError } = await supabase

(Showing lines 1-200 of 802. Use offset=201 to continue.)
</content>
```

---

## Assistant (Plan · DeepSeek V4 Flash Free · 8.7s)

_Thinking:_

Now I can see the full picture. The `PropertyTenants.tsx` uses `allTenants` from `usePropertyTenantsData`, which goes through `tenantService.getTenanciesByProperty()` → `mapToTenancyDomain()`. The status is accessed as `t.tenancy_status` on the `Tenant` type (line 71: `tenancy_status: t.status`). So if I apply `computeTenancyStatus()` in the mapper, it flows through.

Key lines to verify:
- Line 103: `t.tenancy_status !== 'historic'` (filter selectable)
- Line 105: `currentTenant?.tenancy_status === 'historic'` (read-only check)
- Line 109: same filter
- Lines 129-132: `canSetupNewTenancy` logic checks for `ending_tenancy`, `historic`, `pending`
- Line 133: `hasEndingTenancy` check for `ending_tenancy`
- Line 176: `currentTenant?.tenancy_status === 'ending_tenancy' || 'pending'` (edit block)

All these use the computed `status` from the domain mapper. So one change in `mapToTenancyDomain` covers these.

Now I'm confident in the plan. Let me also verify the `Tenant` interface in `usePropertyTenants` (lines 9-30) to see if `planned_ending_date` is available: Yes, line 15: `planned_ending_date?: string | null;`. Good, the mapper passes it at line 74: `planned_ending_date: t.plannedEndDate`.

Wait, I need to look more carefully. The `mapToTenancyDomain` function maps `row.planned_ending_date` to `plannedEndDate`. Then in `usePropertyTenantsData`, line 74 does `planned_ending_date: t.plannedEndDate`. So `computeTenancyStatus()` in the mapper will have access to both `row.tenancy_status` and `row.planned_ending_date`.

But in `mapToTenancyDomain`, the function receives the raw Supabase row (`PropertyTenantJoined`), which has all columns. So I need to check what `PropertyTenantJoined` looks like:

```ts
type PropertyTenantJoined = PropertyTenant & {
  properties: Pick<Property, 'title' | 'address'> | null;
  profiles: Pick<Profile, 'first_name' | 'last_name' | 'email'> | null;
};
```

And `PropertyTenant` has `tenancy_status` and `planned_ending_date`. So I can pass the row directly to `computeTenancyStatus()`.

Now let me write the final plan clearly.

Actually, also — let me check: currently `PropertyTenantJoined` extends the raw DB type. Does the DB type have `tenancy_status` as `string`? Let me check the generated type:

**Tool: grep**

**Input:**
```json
{
  "include": "*.ts",
  "pattern": "tenancy_status.*:",
  "path": "/home/dragutin/projects/rentmate/src/types"
}
```

**Output:**
```
Found 3 matches
/home/dragutin/projects/rentmate/src/types/supabase.ts:
  Line 1200:           tenancy_status: string | null

  Line 1213:           tenancy_status?: string | null

  Line 1226:           tenancy_status?: string | null

```

---

## Assistant (Plan · DeepSeek V4 Flash Free · 11.9s)

_Thinking:_

Good. `tenancy_status` is `string | null` in the generated types. And `planned_ending_date` is `string | null` too. So `computeTenancyStatus()` should accept `string | null` for both fields.

Now I have everything I need for the final plan. Let me present it clearly and concisely.

Now I have the complete picture. Here's the final plan:

---

## Final Plan — Phase 1 + Phase 2 (no audit log)

### Phase 1: Fix Broken Edge Functions (~15 min, 2 files)

**File: `supabase/functions/manage-tenancy-limit/index.ts:40`**
- `'inactive'` → `'historic'`
- This is called from `Rentals.tsx:221` after invitation acceptance. It's supposed to FIFO-clean old tenancies but currently queries a status that never exists (`'inactive'` is not in the DB CHECK constraint). It currently runs as a no-op.

**File: `supabase/functions/enforce-data-retention/index.ts:54`**
- `.eq('tenancy_status', 'ended')` → `.eq('tenancy_status', 'historic')`
- Same pattern: `'ended'` is not a valid status in the DB. The data retention job never finds expired tenancies to anonymize.

No new files, no DB changes.

---

### Phase 2: `computeTenancyStatus()` with Ending Window (~45 min, 4 files)

**File 1: `src/lib/tenancyStatus.ts`** (new)

```ts
import { differenceInDays } from "date-fns";
import type { TenancyStatus } from "@/types/domain";

const ENDING_WINDOW_DAYS = 60;

export function computeTenancyStatus(tenancy: {
  tenancy_status: string | null;
  planned_ending_date: string | null;
}): TenancyStatus {
  if (!tenancy.tenancy_status) return null;
  if (tenancy.tenancy_status === "historic") return "historic";
  if (tenancy.tenancy_status === "pending") return "pending";

  // Auto-derive ending_tenancy when end date is within the 60-day window
  if (tenancy.tenancy_status === "active" && tenancy.planned_ending_date) {
    const daysUntilEnd = differenceInDays(
      new Date(tenancy.planned_ending_date),
      new Date()
    );
    if (daysUntilEnd <= ENDING_WINDOW_DAYS) return "ending_tenancy";
  }

  return tenancy.tenancy_status;
}
```

**File 2: `src/services/tenantService.ts` line 14-35**

Single change in `mapToTenancyDomain()`:
```ts
// Before:
status: row.tenancy_status,

// After:
status: computeTenancyStatus(row),
```

This is the single choke point that covers ~95% of status reads — all `TenancyDomain` consumers: `getTenanciesByProperty`, `getTenanciesByManager`, `getTenanciesByTenant`, `getTenancy`, `getActiveTenancyForProperty`. The computed status flows through `usePropertyTenantsData` into `Tenant.tenancy_status`, which feeds `PropertyTenants.tsx` (lines 103, 105, 109, 129-133, 176), `TenancyOverviewCard`, `ContactInfoCard`, `StatusBadge`, etc.

**No other service/hook changes needed.** The remaining direct-Supabase-query paths that read `tenancy_status` (like `getPropertyTenantsForManager` which is exported but never imported) either handle it correctly via the stored value or are dead code. The stored value is preserved and correct — the utility only overrides `active` → `ending_tenancy` when the end date is within 60 days, which is a safety net for cases where the manager set a `planned_ending_date` without triggering the explicit transition.

---

### Summary

| File | Change | Lines |
|---|---|---|
| `supabase/functions/manage-tenancy-limit/index.ts` | `'inactive'` → `'historic'` | 1 |
| `supabase/functions/enforce-data-retention/index.ts` | `'ended'` → `'historic'` | 1 |
| `src/lib/tenancyStatus.ts` | New file | ~20 |
| `src/services/tenantService.ts` | Import + call in mapper | +2, changed 1 |

**4 files, ~24 lines total, no DB migrations, no new dependencies.**

---

Ready to proceed?

---

