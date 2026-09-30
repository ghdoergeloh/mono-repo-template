import { implement, ORPCError } from "@orpc/server";

import type { Session } from "@repo/core";
import type { Database } from "@repo/db/client";
import { contract } from "@repo/contract";
import { handlers } from "@repo/core";

export interface RouterDeps {
  db: Database;
  /** The session of a request, or null without a valid login. */
  getSession: (headers: Headers) => Promise<Session | null>;
}

/**
 * Procedures anyone may call without a login, as `router.procedure`.
 * Every other procedure answers 401 without a session; `router.spec.ts`
 * checks that for the whole contract.
 */
export const PUBLIC_PROCEDURES = ["user.me"] as const;

/** Implements the contract with the core handlers. */
export function createRouter(deps: RouterDeps) {
  const base = implement(contract).$context<{ headers: Headers }>();

  const withSession = base.middleware(async ({ context, next }) =>
    next({ context: { session: await deps.getSession(context.headers) } }),
  );
  const authed = base.use(withSession).use(({ context, next }) => {
    if (!context.session) throw new ORPCError("UNAUTHORIZED");
    return next({ context: { session: context.session } });
  });
  const open = base.use(withSession);

  return base.router({
    user: {
      me: open.user.me.handler(({ context }) =>
        handlers.user.me({
          input: undefined,
          context: { db: deps.db, session: context.session },
        }),
      ),
      hello: authed.user.hello.handler(({ context }) =>
        handlers.user.hello({
          input: undefined,
          context: { db: deps.db, session: context.session },
        }),
      ),
    },
  });
}
