import { describe, expect, it } from "vitest";

import type { Database } from "@repo/db/client";

import type { HandlerContext } from "./types";
import { hello, me } from "./user";

const db = {} as Database;
const session = {
  user: { id: "u1", email: "ada@example.com", name: "Ada" },
};

function args(context: Partial<HandlerContext>) {
  return { input: undefined, context: { db, session: null, ...context } };
}

describe("user handlers", () => {
  it("me returns the session user", () => {
    expect(me(args({ session }))).toEqual({ user: session.user });
  });

  it("me returns null without a session", () => {
    expect(me(args({}))).toEqual({ user: null });
  });

  it("hello greets the session user or a guest", () => {
    expect(hello(args({ session }))).toEqual({ message: "Hello, Ada!" });
    expect(hello(args({}))).toEqual({ message: "Hello, Guest!" });
  });
});
