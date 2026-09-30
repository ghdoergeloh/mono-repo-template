# AGENTS.md

Instructions for coding agents in this repository. Only rules that cannot be read off the code belong here. Overviews and command lists go in `README.md`. Rules that a config or a test already enforces do not need to be repeated; prefer a new check over a new rule here.

## Repository Rules

- Business logic lives in `packages/core/src/services/*`. Handlers in `packages/core/src/handlers/*` and the routes in `apps/api` only wire things up. `.dependency-cruiser.cjs` enforces the package boundaries.
- A new API endpoint starts in `packages/contract/src/index.ts`, then a handler in `packages/core/src/handlers/`, then one line in `apps/api/src/router.ts`. Every procedure needs a session; a public one goes into `PUBLIC_PROCEDURES` there, and `router.spec.ts` checks all of them.
- Configuration is read once, in `apps/api/src/env.ts` (`loadEnv`), and passed on. Packages export factories (`createAuth`, `createDatabase`, `createMailer`, `createApp`) and never read `process.env` on import.
- The SPA and the API share one origin (`docs/decisions/0001-*`). The SPA calls relative paths under `/api`; no API URL goes into the frontend build.
- A schema change needs a migration: `pnpm db:generate`, and commit `packages/db/drizzle`. CI fails when they differ.
- Dependency versions come from the `pnpm-workspace.yaml` catalogs. Write `catalog:` (or `catalog:react19`) in `package.json`, never a literal version.
- `pnpm -F <pkg> pack` runs pnpm's builtin pack command, not the package script. Use `pnpm --filter <pkg> run pack`.
- After changing the better-auth config, run `pnpm -F @repo/auth generate` to regenerate `packages/db/src/schema/auth-schema.ts`, then `pnpm db:generate`.
- Scaffold a package with `pnpm turbo gen init`, a UI component with `pnpm -F @repo/ui ui-add`.

## Tests

- Unit tests never reach the network (`tooling/vitest/no-network.ts`). Model services and other outside systems get a fake that the test passes in.
- Database tests use `createTestDatabase()` from `@repo/db/testing` (in-memory PGlite, migrated, one copy per test). Locks, parallel transactions and other concurrency need `createPostgresTestDatabase()`; those tests are skipped without `TEST_DATABASE_URL` and run in CI.
- Coverage floors in each `vitest.config.ts` are fixed numbers. Raise them by hand when the coverage grows; never lower them to make a change pass.
- Every bug fix and every review finding gets a test that fails without the fix.
- Screenshot references (`__screenshots__`) come from Chromium on Linux arm64 (CI runner `ubuntu-24.04-arm`, dev container on Apple silicon); other systems skip the comparison. Update them only for an intended visual change, and look at every new image before you commit it.

## Styling

Use semantic tokens (`bg-primary`, `text-foreground`, `border-border`, …), never raw palette colors (`bg-gray-*`, `text-indigo-*`, …). Tokens carry dark mode behaviour and pass the contrast test, raw palettes do not. The tokens are the variables in `tooling/tailwind/theme.css`. Components added with `ui-add` come with raw palette colors. Convert them to tokens.

- Screens in `apps/react` are built from `@repo/ui` only. A missing component goes into `packages/ui` first, with a story for each state (empty, filled, invalid, disabled, open, the limits of its values), ideally in its own small pull request before the screens that use it.
- A new combination of text and background tokens needs a pair in `packages/ui/src/test/color-pairs.ts`.
- `text-muted-foreground` is for side lines in `text-sm` or `text-xs`, never for running text.
- A new screen goes into the `screens` list of `apps/e2e/tests/screens.e2e.ts`: desktop and phone, light and dark, axe and a screenshot.

For wiring Tailwind into a new app, adding tokens, or missing-class and dark-mode-flash problems, follow `.claude/skills/tailwind-app-setup/SKILL.md`.

## Working in Parallel

Several people or agents often work on this repository at the same time. Keep shared files small and append-only:

- One decision per file in `docs/decisions/`, the status in `docs/status.md` (at most 50 lines). Do not collect decisions or history in one long file.
- UI texts of a screen live next to the screen, not in one shared file.
- A task for a helper agent names the files it owns and the files it must not touch.

## Language on GitHub

Everything that ends up on GitHub is English: pull request titles and descriptions, issues, review comments and replies, commit messages, release notes. This holds whatever language the conversation with the agent is in.

Write plain English for readers who do not speak it as a first language: short sentences, common words, no idioms, no slang, no references that only make sense in one country, abbreviations spelled out on first use. Never translate code, identifiers, paths, log output or error messages.

## Code Comments

Same plain English. Write only comments that increase maintainability — on public methods and module exports, and on non-obvious code blocks. A comment describes the current state and purpose. It must be change-independent: do not describe what the code was before, why it was changed, or how it relates to a previous version. Keep them short.

## Before Calling a Task Done

Run `pnpm format:fix`, then `lint`, `typecheck` and `test:unit` for every changed package (`pnpm --filter <package> <script>`), or the workspace-wide scripts when a change spans packages. Fix what they report. Run `pnpm knip` and `pnpm depcruise` when dependencies or imports between packages changed, and `pnpm test:e2e` when a screen or the API changed.
