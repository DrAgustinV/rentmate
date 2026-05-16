# Restore Utilities & Review Wizard Steps

## Problem
Steps 4 (Utilities) and 5 (Review) in `CreateTenancyWizard.tsx` render nothing. The refactoring extracted steps 0-3 into separate components but never created components for steps 4 and 5.

## Changes

### 1. Create `src/components/tenancy-wizard/StepUtilities.tsx`
New component following the pattern of the existing step components:
- Props: `form: UseFormReturn<any>`, `utilityTypes: string[]`
- Local state: `newUtilityType`, `newUtilityResponsibility`
- "Add Utility" section: Select for utility type, Select for responsibility (manager_pays/tenant_pays/not_applicable), Add button
- Configured utilities list: badges with responsibility label and remove (X) button
- Uses `form.getValues`/`form.setValue` to read/write `utilities_config`

### 2. Create `src/components/tenancy-wizard/StepReview.tsx`
New component:
- Props: `form: UseFormReturn<any>`
- Summary card with sections: Tenant email, Verification badges, Contract method, Rent details, Utilities badges
- Uses `form.watch` to get current values
- All labels use translation keys with fallback English strings

### 3. Update `src/components/tenancy-wizard/index.ts`
Add exports:
```ts
export { StepUtilities } from './StepUtilities';
export { StepReview } from './StepReview';
```

### 4. Update `src/components/CreateTenancyWizard.tsx`
- Import `StepUtilities` and `StepReview` from `@/components/tenancy-wizard`
- Add render blocks after line 295:
  ```tsx
  {currentStep === 4 && <StepUtilities form={form} utilityTypes={utilityTypes} />}
  {currentStep === 5 && <StepReview form={form} />}
  ```
- Remove unused imports: `Plus`, `X`, `Zap`, `CheckCircle2`, `Smartphone`, `Alert`, `AlertDescription`, `useUtilityTypes` (if `utilityTypes` is now only passed as prop — actually keep it, it's still used in the main component to fetch utilityTypes and pass to StepUtilities)
