import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import type { Database } from "@repo/db/client";
import * as schema from "@repo/db/schema";

/** Base path of the better-auth endpoints. */
export const AUTH_BASE_PATH = "/api/auth";

export interface AuthOptions {
  db: Database;
  /** `BETTER_AUTH_SECRET`, at least 32 characters. */
  secret: string;
  /**
   * `BETTER_AUTH_URL`: the public origin of the app, where the browser loads
   * the SPA and calls `/api`. Links in emails point there.
   */
  baseURL: string;
  /** More origins that may call the API with a session, besides `baseURL`. */
  trustedOrigins?: string[];
  /**
   * Sends the link that verifies a new email address. Without it, sign-up
   * signs the user in at once and addresses are not verified.
   */
  sendVerificationEmail?: (email: string, url: string) => Promise<void>;
}

/** The better-auth options for the given settings. */
export function authConfig(options: AuthOptions) {
  const origin = new URL(options.baseURL).origin;
  const send = options.sendVerificationEmail;
  return {
    baseURL: origin,
    basePath: AUTH_BASE_PATH,
    secret: options.secret,
    database: drizzleAdapter(options.db, { provider: "pg", schema }),
    trustedOrigins: [...new Set([origin, ...(options.trustedOrigins ?? [])])],
    // better-auth skips the origin check when NODE_ENV is "test". Keep it on,
    // so tests see the behavior of production.
    advanced: { disableOriginCheck: false },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: send !== undefined,
    },
    ...(send && {
      emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: ({ user, url }) => send(user.email, url),
      },
    }),
  } satisfies BetterAuthOptions;
}

/** Creates the better-auth instance (see {@link authConfig}). */
export function createAuth(options: AuthOptions) {
  return betterAuth(authConfig(options));
}

/** The better-auth instance of the app. */
export type Auth = ReturnType<typeof createAuth>;
