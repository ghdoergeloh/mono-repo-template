# API

Hono server with better-auth under `/api/auth`, the oRPC contract under
`/api/rpc`, the probes `/health` and `/ready`, and in production the built
SPA (`SPA_DIR`).

- `src/env.ts` reads and checks the environment once.
- `src/app.ts` builds the HTTP app from its dependencies; tests run it
  without a server.
- `src/router.ts` implements the contract with the core handlers.
- `src/server.ts` wires everything and starts the server.

```bash
pnpm -F @repo/api dev     # with the .env of the repository root
```

In development, open the SPA on http://localhost:5173; Vite forwards `/api`
to this server on port 3000.
