# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

### EMI Eligibility Calculator (artifacts/emi-calculator)
- **Type**: Expo mobile app
- **Purpose**: Lead generation tool for Indian loan products
- **Tech**: React Native + Expo Router, Zustand, Supabase, expo-haptics
- **Screens**:
  - `/` — Screen 1: Profile (name+mobile captured FIRST for drop-off tracking, then employment)
  - `/obligations` — Screen 2: Existing loan/CC obligations with live FOIR preview
  - `/loan-intent` — Screen 3: Loan type cards, amount, tenure, live eligibility preview
  - `/result` — Screen 4: Eligibility result + simplified lead capture (name/mobile pre-filled)
- **Lead Flow**:
  - Screen 1 "Continue" → inserts partial lead `{name, mobile, employment_type, status:'partial'}` → stores leadId
  - Screen 4 "Get My Loan Offers" → updates same lead with full data + `status:'new'` (or inserts if no leadId)
- **Backend**: Supabase table `emi_calc_leads` (all form data + computed fields)
- **Env vars**: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **Logic**: FOIR-based eligibility engine in `lib/eligibility.ts`
- **Store**: `store/useFormStore.ts` — contact (name+mobile), employment, obligations, loanIntent, result, leadId
- **Components**: StepLayout, ProgressBar, RadioCardGroup, SelectInput (bottom sheet), ToggleBoolean, CurrencyInput, EmployerSearch, PrimaryButton

### API Server (artifacts/api-server)
- Express 5 backend serving on `/api`
- Drizzle ORM with PostgreSQL

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
