# 0001: One origin for the SPA and the API

Status: accepted (2026-09-30)

## Context

A SPA and its API can run on two origins or on one. Two origins need CORS,
cross-site cookies, an allow list of origins in two places and an API URL
in the frontend build, and development then differs from production.

## Decision

The API serves the built SPA (`SPA_DIR`) and the API under `/api` on one
origin. In development, the Vite dev server forwards `/api` to the API, so
the browser sees one origin there too.

## Reason

Session cookies stay first-party, CORS is only needed for extra origins
(`TRUSTED_ORIGINS`), and one container runs the whole app. A separate
static host for the SPA would add a second deployment for no gain.

## Consequences

`BETTER_AUTH_URL` is the origin the browser sees: the Vite dev server in
development, the public URL in production. Routes of the SPA must not
start with `/api`, `/health` or `/ready`.
