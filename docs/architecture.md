# Architecture

Describe here what cannot be read off the package list in the README:
the data model, the main flows, and the rules that hold across packages.
Keep it current with the code; a pull request that changes one of these
changes this file too.

## Data model

The tables live in `packages/db/src/schema`. Migrations in
`packages/db/drizzle` are generated from it (`pnpm db:generate`).

## Flows

## Rules across packages

- Business logic lives in `packages/core`. The API, the CLI and other
  transports only wire it up (`.dependency-cruiser.cjs`).
- Every procedure needs a session, except the ones in
  `PUBLIC_PROCEDURES` (`apps/api/src/router.ts`).
