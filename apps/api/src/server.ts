import { serve } from "@hono/node-server";
import { onError, ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

import type { Session } from "@repo/core";
import { createAuth } from "@repo/auth/auth";
import { RPC_PATH } from "@repo/contract";
import { createDatabase } from "@repo/db/client";
import { createMailer, sendVerificationEmail } from "@repo/transactional";

import type { Env } from "./env";
import { createApp } from "./app";
import { createRouter } from "./router";

/** How long running requests may take after SIGTERM. */
const STOP_TIMEOUT_MS = 10_000;

/**
 * Wires the app from the validated environment and starts the HTTP server
 * on all interfaces. Stops cleanly on SIGTERM and SIGINT.
 */
export function startServer(env: Env): void {
  const database = createDatabase(env.databaseUrl);
  const mailer = env.smtp ? createMailer(env.smtp) : null;
  const auth = createAuth({
    db: database.db,
    secret: env.auth.secret,
    baseURL: env.auth.url,
    trustedOrigins: env.trustedOrigins,
    ...(mailer && {
      sendVerificationEmail: (email, url) =>
        sendVerificationEmail(mailer, email, url),
    }),
  });
  console.log(
    mailer
      ? `Email verification on, via ${env.smtp?.host}`
      : "Email verification off: SMTP_HOST is not set",
  );

  const getSession = async (headers: Headers): Promise<Session | null> => {
    const session = await auth.api.getSession({ headers });
    if (!session) return null;
    const { id, email, name } = session.user;
    return { user: { id, email, name } };
  };
  const rpc = new RPCHandler(createRouter({ db: database.db, getSession }), {
    interceptors: [
      onError((error) => {
        // Expected answers such as 401 or 404 are not errors of the server.
        if (!(error instanceof ORPCError) || error.status >= 500)
          console.error(error);
      }),
    ],
  });

  const app = createApp({
    trustedOrigins: [new URL(env.auth.url).origin, ...env.trustedOrigins],
    spaDir: env.spaDir,
    ready: async () => {
      await database.ping();
      return true;
    },
    auth: (request) => auth.handler(request),
    rpc: async (request) => {
      const { matched, response } = await rpc.handle(request, {
        prefix: RPC_PATH,
        context: { headers: request.headers },
      });
      return matched ? response : null;
    },
  });

  const server = serve(
    { fetch: app.fetch, port: env.port, hostname: "0.0.0.0" },
    (info) => {
      console.log(`API on http://localhost:${info.port}`);
    },
  );

  let stopping = false;
  const stop = (signal: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`${signal}: stopping`);
    const closeDatabase = () =>
      database.close().then(
        () => process.exit(0),
        (error: unknown) => {
          console.error(error);
          process.exit(1);
        },
      );
    // Requests that are running finish first; they still need the pool.
    // A request that hangs must not keep the process alive.
    const fallback = setTimeout(() => {
      console.warn(
        `Requests still running after ${STOP_TIMEOUT_MS / 1000} s; stopping anyway`,
      );
      void closeDatabase();
    }, STOP_TIMEOUT_MS);
    server.close(() => {
      clearTimeout(fallback);
      void closeDatabase();
    });
  };
  process.on("SIGTERM", () => stop("SIGTERM"));
  process.on("SIGINT", () => stop("SIGINT"));
}
