import { z } from "zod";

import type { SmtpConfig } from "@repo/transactional";

const optional = z
  .string()
  .optional()
  .transform((value) => (value?.trim() ? value.trim() : undefined));

const origins = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.url({ protocol: /^https?$/ })))
  // CORS compares origins; a trailing slash or a path would never match.
  .transform((urls) => urls.map((url) => new URL(url).origin));

/** The secret of `.env.example`; it must never reach production. */
const EXAMPLE_SECRET = "your-secret-key-here-min-32-chars";

const isLoopback = (url: string) =>
  ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname);

const Raw = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  API_PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  TRUSTED_ORIGINS: origins,
  SPA_DIR: optional,
  SMTP_HOST: optional,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SMTP_USER: optional,
  SMTP_PASS: optional,
  SMTP_FROM: optional,
});

/** The validated configuration of the API process. */
export interface Env {
  port: number;
  databaseUrl: string;
  auth: {
    secret: string;
    /** The public origin of the app (`BETTER_AUTH_URL`). */
    url: string;
  };
  /** Origins besides `auth.url` that may call the API with a session. */
  trustedOrigins: string[];
  /** Directory of the built SPA; null when Vite serves it. */
  spaDir: string | null;
  /** SMTP for verification emails; null turns email verification off. */
  smtp: SmtpConfig | null;
}

/**
 * Reads and checks the environment once at start. Throws one error that
 * names every missing or invalid variable.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = Raw.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `  ${issue.path.join(".")}: ${issue.message}`,
    );
    throw new Error(`Invalid environment:\n${problems.join("\n")}`);
  }
  const raw = parsed.data;
  const problems: string[] = [];
  if (raw.SMTP_HOST && !raw.SMTP_FROM)
    problems.push("SMTP_FROM: required when SMTP_HOST is set");
  if (raw.NODE_ENV === "production") {
    if (raw.BETTER_AUTH_SECRET === EXAMPLE_SECRET)
      problems.push("BETTER_AUTH_SECRET: still the value of .env.example");
    if (
      new URL(raw.BETTER_AUTH_URL).protocol !== "https:" &&
      !isLoopback(raw.BETTER_AUTH_URL)
    )
      problems.push("BETTER_AUTH_URL: must use https in production");
  }
  if (problems.length > 0)
    throw new Error(
      `Invalid environment:\n${problems.map((p) => `  ${p}`).join("\n")}`,
    );
  return {
    port: raw.API_PORT,
    databaseUrl: raw.DATABASE_URL,
    auth: { secret: raw.BETTER_AUTH_SECRET, url: raw.BETTER_AUTH_URL },
    trustedOrigins: raw.TRUSTED_ORIGINS,
    spaDir: raw.SPA_DIR ?? null,
    smtp:
      raw.SMTP_HOST && raw.SMTP_FROM
        ? {
            host: raw.SMTP_HOST,
            port: raw.SMTP_PORT,
            secure: raw.SMTP_SECURE,
            from: raw.SMTP_FROM,
            ...(raw.SMTP_USER && { user: raw.SMTP_USER }),
            ...(raw.SMTP_PASS && { pass: raw.SMTP_PASS }),
          }
        : null,
  };
}
