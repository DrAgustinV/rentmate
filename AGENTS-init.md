# RentMate — Agents Guide

## Build & Dev Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 8080 |
| `npm run build` | Production build |
| `npm run lint` | ESLint check (flat config, ESLint 9) |
| `npm test` | Run Vitest tests |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | Coverage report (v8) |
| `npm run preview` | Preview production build |

## Project Setup

### Prerequisites
- Node.js 18+ (ESM project — `"type": "module"`)
- A Supabase project (free tier works)

### Environment Variables
Copy `.env.example` to `.env` and fill in:

```env
# REQUIRED
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_APP_ENV=development
```

### Feature Flags (`src/config/env.ts`)
Toggle features via these env vars — accessed via `env.features.enableKYC`, etc.:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_ENABLE_KYC` | `true` | KYC verification (KILT, Didit, OpenAPI) |
| `VITE_ENABLE_STRIPE_CONNECT` | `true` | Stripe Connect payments |
| `VITE_ENABLE_YOUSIGN` | `true` | YouSign e-signatures |
| `VITE_ENABLE_DOCUSEAL` | `false` | DocuSeal e-signatures |
| `VITE_ENABLE_QUALIFIED_SIGNATURE` | `false` | Qualified e-signatures (EU) |
| `VITE_ENABLE_OPENAI` | `false` | AI assistant features |
| `VITE_ENABLE_DEBUG` | `true` in dev | Debug mode |

### API Config (server-side only, never in `.env`)
```
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
RESEND_API_KEY=...
OPENAI_API_KEY=...
```

## Project Stack

- **Vite 5** + **React 18** + **TypeScript** (SWC compiler)
- **Tailwind CSS v3** (class-based dark mode, HSL CSS variables)
- **shadcn/ui** — 52 primitives installed (see full list below)
- **React Router v6** (lazy-loaded pages, `@/pages/`)
- **TanStack React Query v5** (server state)
- **Supabase** (auth, database, storage, edge functions)
- **react-hook-form** + **zod** (forms + validation)
- **Vitest** + **@testing-library/react** (testing)

## Code Conventions

### Imports
- Use `@/` path alias for all source files (e.g. `import { Button } from "@/components/ui/button"`)
- Barrel exports: `@/components/ui/`, `@/services/`, `@/hooks/`, `@/lib/`, `@/types/`, `@/pages/`
- Keep imports organized: React/libraries → contexts/hooks → components → services → types

### i18n Translations
- Use `t("namespace.key")` from `useLanguage()` context — never hardcode user-facing strings
- Translation keys use dot-notation: `common.save`, `properties.contract`, `tenancy.wizard.title`
- Default language: English (`src/lib/i18n/translations/en.ts` — 1501 lines, canonical source)
- 12 supported languages: en, es, fr, de, pt, it, nl, pl, sr, ja, zh, ar
- Fallback chain: current lang → English → raw key
- **Toast messages must use `t()`** — ESLint rule `no-restricted-syntax` enforces this

### Styling
- Use Tailwind utility classes + `cn()` from `@/lib/utils` for conditional classes
- CSS custom properties in `src/index.css` for theming (light/dark)
- shadcn/ui patterns: `variant`, `size` props on components
- Design tokens: `card-shine` class, gradient icons, status badges with `bg-{color}-500/10 text-{color}-600`

### Component Patterns
- Default exports for pages (lazy-loaded), named exports for everything else
- Props interfaces defined above the component
- **All hooks must be called before any early returns** (React rules of hooks)
- Use `useQuery` / `useMutation` from `@tanstack/react-query` for async data
- Mutation callbacks: `onSuccess` → `showToast.success()` + `queryClient.invalidateQueries()`

### Toast API (`@/lib/toast`)
```ts
import { showToast } from "@/lib/toast";

showToast.success(title, description?, options?);
showToast.error(title, description?, options?);
showToast.info(title, description?, options?);
showToast.warning(title, description?, options?);
showToast.neutral(title, description?, options?);
showToast.silent(title, description?, options?);
// Options: { duration?: number } — defaults to 4000ms
```

### Error Handling Conventions
- **Services** (`src/services/*.ts`) — throw on Supabase error: `if (error) throw error;` — never silently swallow
- **Hooks** — use `onError` in `useMutation` + `showToast.error()` for user-facing feedback
- **Components** — never query Supabase directly (use hooks/services)
- **Forms** — surface validation errors via `react-hook-form`'s `FormMessage`; API errors via toast
- No `error` state variable pattern — let React Query's `error` prop handle it

### shadcn/ui — Components Already Installed
All 52 are in `src/components/ui/`. Do NOT re-install with `npx shadcn add`:

accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, country-select, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, status-badges, switch, table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip, tooltip-button

### Testing
- Co-locate tests next to source files: `*.test.ts`, `*.test.tsx`
- Setup: `src/test/setup-tests.ts` (mocks Supabase, toast, LanguageContext)
- `describe` / `it` / `expect` from vitest (globals enabled)
- Example patterns: `analyticsService.test.ts`, `useKYC.test.tsx`, `useSubscription.test.tsx`

### Services & API Layer
- Supabase queries live in `src/services/*.ts` (e.g., `tenancyService`, `documentService`)
- Hooks call services, not Supabase directly
- Types in `src/types/domain.ts` and `src/integrations/supabase/types.ts`
- Feature flags via `VITE_ENABLE_*` env vars, accessed through `src/config/env.ts`

### Supabase Edge Functions
- Located in `supabase/functions/` (Deno/TypeScript) — 50+ functions
- Shared utilities in `supabase/functions/_shared/`
- **Invocation from client:**
  ```ts
  const { data, error } = await supabase.functions.invoke('function-name', {
    body: { key: value },
  });
  if (error) throw error;
  ```

## Database Schema (Core Tables)

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `profiles` | `id`, `email`, `first_name`, `last_name`, `kyc_status` | User profiles, linked to auth.users |
| `properties` | `id`, `title`, `manager_id`, `status`, `country` | `status`: `active`/`inactive`/`ending_tenancy` |
| `property_tenants` | `id`, `property_id`, `tenant_id`, `tenancy_status`, `started_at`, `planned_ending_date`, `ended_at` | `tenancy_status`: `pending`/`active`/`ending_tenancy`/`historic` |
| `tenancy_requirements` | `id`, `property_id`, `tenancy_id`, `status`, `rent_amount_cents`, `contract_method` | `status`: `draft`/`sent`/`accepted`/`completed`/`cancelled` |
| `invitations` | `id`, `property_id`, `email`, `status`, `token`, `expires_at` | `status`: `pending`/`accepted`/`expired`/`declined`/`cancelled`/`dismissed` |
| `rent_agreements` | `id`, `property_id`, `tenancy_id`, `rent_amount_cents`, `payment_day`, `is_active` | Active per tenancy |
| `contract_signatures` | `id`, `tenancy_id`, `workflow_status`, `provider` | Tracks e-signature workflow |
| `property_documents` | `id`, `property_id`, `tenancy_id`, `document_title`, `file_path`, `version` | Versioned via `parent_document_id` |
| `tickets` | `id`, `property_id`, `tenancy_id`, `title`, `status`, `priority` | `status`: `open`/`in_progress`/`resolved`/`cancelled` |
| `payments` | `id`, `property_id`, `tenancy_id`, `amount_cents`, `status`, `due_date` | Rent payments |

## Key Architecture Notes

- **SPA** — `index.html` served for all routes; meta tags only there
- **Auth gate** — `EmailVerificationGate` wraps all authenticated routes
- **Analytics** — `AnalyticsContext` wraps all routes (tracking via `trackEvent()`)
- **Theme** — `ThemeContext` manages dark/light/system + font size
- **Provider chain** (in `main.tsx`): `ErrorBoundary` → `UserPreferencesProvider` → `ThemeProvider` → `LanguageProvider` → `BrandProvider` → `App`
- **Tenant lifecycle**: pending requirement → (draft → sent) → active → ending_tenancy → historic
- **Self-managed** path creates `property_tenants` immediately with `status = 'active'` (skips draft/sent)
- **E-signatures**: multi-provider (YouSign, DocuSeal, Qualified, AutoFirma, OpenAPI)

## Anti-Patterns / What NOT To Do

- ❌ **Don't query Supabase directly in components** — use hooks/services layer
- ❌ **Don't hardcode user-facing strings** — always use `t("key")`
- ❌ **Don't use `any` types** — prefer proper interfaces or `unknown` with type guards
- ❌ **Don't re-install shadcn/ui components** — check `src/components/ui/` first, they're already there
- ❌ **Don't put server secrets in `.env`** (service keys, API keys) — those stay in Supabase dashboard
- ❌ **Don't use React Query's `onSuccess` for side effects that change other state** — use `useEffect` watching query data instead
- ❌ **Don't add `node_modules` or `dist` to version control** — they're already in `.gitignore`
```
