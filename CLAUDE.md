# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev                          # Start all apps/packages in watch mode (Turbo)
pnpm -F @repo/api dev             # Start only the API
pnpm -F react dev                 # Start only the React frontend

# Build & Type Check
pnpm build                        # Build all workspaces
pnpm typecheck                    # Type-check all workspaces
pnpm -F @repo/db build            # Build a single package (use -F <package-name>)

# Lint & Format
pnpm lint                         # Lint all workspaces
pnpm lint:fix                     # Lint and auto-fix
pnpm format                       # Check formatting
pnpm format:fix                   # Fix formatting

# Database (requires DATABASE_URL in .env)
pnpm db:push                      # Push schema to database
pnpm db:generate                  # Generate migrations
pnpm db:migrate                   # Run migrations
pnpm db:studio                    # Open Drizzle Studio

# Auth schema (after changing better-auth config)
pnpm -F @repo/auth generate       # Regenerate auth tables into packages/db/src/schema/auth-schema.ts

# Docker (PostgreSQL + Mailpit)
docker compose up -d              # Start local services

# Scaffold a new package
pnpm turbo gen init               # Interactive generator for new packages

# Add UI components (shadcn-style)
pnpm -F @repo/ui ui-add           # Add a new UI component
```

## Architecture

This is a **pnpm monorepo** with **Turborepo** for build orchestration. All packages use ESM (`"type": "module"`) and strict TypeScript.

### Workspaces

- **`apps/api`** - Hono REST API with oRPC handlers. Runs on port 3000. Entry: `src/index.ts` -> `src/app.ts` -> `src/router.ts`.
- **`apps/react`** - Vite + React 19 frontend. Uses TanStack Router (file-based routing in `src/routes/`) and TanStack Query with oRPC client. Path alias: `~/` maps to `src/`.
- **`apps/cli`** - Commander-based CLI application. Can operate locally (invoking core directly) or remotely (via oRPC client calling the API).
- **`packages/contract`** - oRPC contract defining the API schema with Zod. Shared between API (implements) and frontend/CLI (consumes as client).
- **`packages/auth`** - better-auth configuration with email/password. Uses Drizzle adapter with PostgreSQL. Exports `./auth` (server) and `./client` (browser).
- **`packages/db`** - Drizzle ORM + PostgreSQL (node-postgres). Exports `./client` (db instance), `./schema` (table definitions). Uses `with-env` script (`dotenv -e ../../.env --`) to load root `.env`.
- **`packages/core`** - Shared business logic (placeholder).
- **`packages/ui`** - React Aria Components with Tailwind CSS and class-variance-authority. Shadcn-compatible CLI for adding components.
- **`tooling/*`** - Shared configs for ESLint, Prettier, TypeScript, Tailwind, Vitest.

### Data Flow

The **contract** package is central: `packages/contract` defines the API shape -> `apps/api` implements it via `@orpc/server` -> `apps/react` consumes it via `@orpc/client` + `@orpc/react-query`. This gives end-to-end type safety from API to frontend.

When adding a new API endpoint:

1. Define the route in `packages/contract/src/index.ts` (schema + method + path)
2. Implement the handler in `apps/api/src/router.ts`
3. The frontend/CLI can immediately consume it with full type inference

### Key Conventions

- **Imports**: Auto-sorted by Prettier — order is: types, react, third-party, `@repo/*` workspace packages, local (`~/`, `../`, `./`). Tailwind classes sorted in `cn()` and `cva()` calls.
- **TypeScript**: Strict mode with `noUncheckedIndexedAccess`, `verbatimModuleSyntax` (use `import type` for type-only imports). Base config in `tooling/typescript/base.json`.
- **ESLint**: Flat config (v9). Configs exported from `tooling/eslint` as `./base`, `./react`. Route files in `apps/react/src/routes/` have `react-refresh/only-export-components` disabled.
- **Dependencies**: Versions centralized in `pnpm-workspace.yaml` catalogs. Use `catalog:` or `catalog:react19` in package.json version fields.
- **Commits**: Conventional commits enforced via commitlint + husky pre-commit hook (lint-staged runs Prettier on staged files).
- **Package exports**: Workspace packages use conditional exports with `types` + `default` fields pointing to `dist/` and `src/` respectively.

### Environment

- Node.js ^24.13.0, pnpm ^10.28.2
- `.env` at repo root (copy from `.env.example`): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `API_PORT`, `VITE_API_URL`
- Docker Compose provides PostgreSQL and Mailpit

## Post-Change Quality Checks

After making any code changes, always run the following checks on affected packages before considering the task done:

1. **Format**: `pnpm format` — apply Prettier formatting across the workspace
2. **Lint**: `pnpm --filter <package> lint` — run ESLint on each changed package
3. **Typecheck**: `pnpm --filter <package> typecheck` — verify TypeScript types on each changed package
4. **Unit tests**: `pnpm --filter <package> test:unit` — run unit tests on each changed package

Use `pnpm lint`, `pnpm typecheck` and `pnpm build` for workspace-wide verification when changes span multiple packages. Fix any errors before marking the task complete.
