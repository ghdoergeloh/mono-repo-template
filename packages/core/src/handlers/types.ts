import type { Database } from "@repo/db/client";

/** The authenticated user as seen by the handlers. */
export interface Session {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

/** Everything a handler may depend on, provided by the transport (API, CLI). */
export interface HandlerContext {
  db: Database;
  session: Session | null;
}

export interface HandlerArgs<TInput = undefined> {
  input: TInput;
  context: HandlerContext;
}
