# End-to-end tests

Playwright tests against the real API, the Vite dev server and a fresh
PostgreSQL database. No outside service is called: without `SMTP_HOST`,
sign-up signs the user in at once.

```bash
docker compose up -d postgres
pnpm test:e2e                          # all tests
pnpm test:e2e --update-snapshots       # after an intended visual change
pnpm -F @repo/e2e exec playwright show-report
```

## What runs

1. `src/prepare-db.ts` drops and creates the database `E2E_DATABASE`
   (default `app_e2e`; the name must contain `_e2e`) and applies the
   migrations.
2. The API starts from source on port `E2E_API_PORT` (default 3100).
3. Vite serves the SPA on port `E2E_WEB_PORT` (default 5273) and forwards
   `/api` to the API. The browser sees one origin, like in production.

Set other ports and another database name per worktree when several runs
share one machine, and `E2E_ADMIN_DATABASE_URL` when PostgreSQL does not run
on `localhost:5432` with the user `postgres`.

## Screens

`tests/screens.e2e.ts` opens every screen on a desktop and a phone (400 px),
in light and dark. For each it checks:

- nothing is wider than the screen,
- axe finds no accessibility problem,
- the screenshot equals the reference in `tests/__screenshots__`.

The references come from Chromium on Linux arm64 (the CI runner, and the
dev container on Apple silicon).
Other systems skip the comparison. Look at every new or changed image
before you commit it. Data on the screens must be the same on every run:
use fixed names and addresses, not the time or random values.

A new screen goes into the `screens` list.
