import { RPCHandler } from "@orpc/server/fetch";
import { describe, expect, it } from "vitest";

import type { Session } from "@repo/core";
import type { Database } from "@repo/db/client";
import { contract, listProcedures, RPC_PATH } from "@repo/contract";

import { createRouter, PUBLIC_PROCEDURES } from "./router";

const ada: Session = {
  user: { id: "u1", email: "ada@example.test", name: "Ada" },
};

/** Calls a procedure over the oRPC protocol, like the web app does. */
async function call(path: string[], session: Session | null) {
  const handler = new RPCHandler(
    createRouter({
      db: {} as Database,
      getSession: () => Promise.resolve(session),
    }),
  );
  const request = new Request(`http://localhost${RPC_PATH}/${path.join("/")}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  const { response } = await handler.handle(request, {
    prefix: RPC_PATH,
    context: { headers: request.headers },
  });
  return response;
}

const procedures = listProcedures(contract);
const isPublic = (name: string) =>
  (PUBLIC_PROCEDURES as readonly string[]).includes(name);

describe("authorization of every procedure", () => {
  it("knows every public procedure", () => {
    const names = procedures.map((p) => p.name);
    expect(names).toEqual(expect.arrayContaining([...PUBLIC_PROCEDURES]));
  });

  it.each(procedures.filter((p) => !isPublic(p.name)).map((p) => [p.name, p]))(
    "%s answers 401 without a session",
    async (_name, procedure) => {
      expect((await call(procedure.path, null))?.status).toBe(401);
    },
  );

  it.each(procedures.filter((p) => isPublic(p.name)).map((p) => [p.name, p]))(
    "%s lets a caller without a session in",
    async (_name, procedure) => {
      // Without input and database the answer may be 400 or 500; only a
      // 401 would mean the procedure is not public.
      expect((await call(procedure.path, null))?.status).not.toBe(401);
    },
  );
});

describe("user procedures", () => {
  it("greets the signed-in user", async () => {
    const response = await call(["user", "hello"], ada);
    expect(await response?.json()).toEqual({
      json: { message: "Hello, Ada!" },
    });
  });

  it("returns no user without a session", async () => {
    const response = await call(["user", "me"], null);
    expect(await response?.json()).toEqual({ json: { user: null } });
  });
});
