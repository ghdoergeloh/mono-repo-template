/**
 * Ports, URLs and the database of the end-to-end run. The ports differ from
 * `pnpm dev` (3000, 5173), so both can run at the same time; set them per
 * worktree when several runs share a machine.
 */
const port = (name: string, fallback: number) =>
  Number(process.env[name] ?? fallback);

export const E2E_WEB_PORT = port("E2E_WEB_PORT", 5273);
const E2E_API_PORT = port("E2E_API_PORT", 3100);

/** The SPA; the Vite dev server forwards `/api` to the API, like production. */
export const WEB_URL = `http://localhost:${E2E_WEB_PORT}`;
export const API_URL = `http://localhost:${E2E_API_PORT}`;

/** A server where the user may create and drop databases. */
export const ADMIN_DATABASE_URL =
  process.env["E2E_ADMIN_DATABASE_URL"] ??
  "postgresql://postgres:postgres@localhost:5432/postgres";

/** The throwaway database; dropped and created on every run. */
export const E2E_DATABASE = process.env["E2E_DATABASE"] ?? "app_e2e";

/** Only a database with this suffix may be dropped. */
export function assertThrowaway(name: string): void {
  if (!/^\w+_e2e\w*$/.test(name))
    throw new Error(`E2E_DATABASE must contain "_e2e": ${name}`);
}

/** `DATABASE_URL` of the API: the admin server with the e2e database. */
export function e2eDatabaseUrl(
  adminUrl = ADMIN_DATABASE_URL,
  database = E2E_DATABASE,
): string {
  const url = new URL(adminUrl);
  url.pathname = `/${database}`;
  return url.toString();
}

/** Environment of the API process: no SMTP, so sign-up signs in at once. */
export function apiEnv(): Record<string, string> {
  return {
    NODE_ENV: "test",
    API_PORT: String(E2E_API_PORT),
    DATABASE_URL: e2eDatabaseUrl(),
    BETTER_AUTH_SECRET: "e2e-secret-that-is-at-least-32-characters",
    // The public origin is the SPA, like in production.
    BETTER_AUTH_URL: WEB_URL,
    SMTP_HOST: "",
  };
}

/** Environment of the Vite dev server. */
export function webEnv(): Record<string, string> {
  return { API_PROXY_TARGET: API_URL };
}
