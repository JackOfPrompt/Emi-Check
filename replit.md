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
  - `/` — Screen 1: Employment & Income (salaried vs self-employed)
  - `/obligations` — Screen 2: Existing loan/CC obligations
  - `/loan-intent` — Screen 3: Loan type, amount, tenure
  - `/result` — Screen 4: Eligibility result + lead capture form
- **Backend**: Supabase table `emi_calc_leads` (all form data + computed fields)
- **Env vars**: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **Logic**: FOIR-based eligibility engine in `lib/eligibility.ts`

### API Server (artifacts/api-server)
- Express 5 backend serving on `/api`
- Drizzle ORM with PostgreSQL

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
