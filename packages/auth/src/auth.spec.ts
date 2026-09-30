import { afterEach, describe, expect, it } from "vitest";

import type { TestDatabase } from "@repo/db/testing";
import { createTestDatabase } from "@repo/db/testing";

import type { AuthOptions } from "./auth";
import { authConfig, createAuth } from "./auth";

const BASE_URL = "http://localhost:5173";
const open: TestDatabase[] = [];

async function auth(options: Partial<AuthOptions> = {}) {
  const database = await createTestDatabase();
  open.push(database);
  return createAuth({
    db: database.db,
    secret: "test-secret-that-is-at-least-32-characters",
    baseURL: BASE_URL,
    ...options,
  });
}

function signUp(instance: Awaited<ReturnType<typeof auth>>) {
  return instance.handler(
    new Request(`${BASE_URL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: BASE_URL },
      body: JSON.stringify({
        name: "Ada Example",
        email: "ada@example.test",
        password: "a-long-test-password",
      }),
    }),
  );
}

afterEach(async () => {
  await Promise.all(open.splice(0).map((d) => d.close()));
});

describe("authConfig", () => {
  it("trusts the public origin and the extra origins once each", () => {
    const config = authConfig({
      db: {} as AuthOptions["db"],
      secret: "x".repeat(32),
      baseURL: "https://app.example.test/some/path",
      trustedOrigins: ["https://app.example.test", "http://localhost:5173"],
    });
    expect(config.baseURL).toBe("https://app.example.test");
    expect(config.trustedOrigins).toEqual([
      "https://app.example.test",
      "http://localhost:5173",
    ]);
  });
});

describe("createAuth", () => {
  it("signs a new user in at once without an email sender", async () => {
    const response = await signUp(await auth());
    expect(response.status).toBe(200);
    const body = (await response.json()) as { token: string | null };
    expect(body.token).toEqual(expect.any(String));
  });

  it("sends a verification link and waits for it with an email sender", async () => {
    const sent: { email: string; url: string }[] = [];
    const response = await signUp(
      await auth({
        sendVerificationEmail: (email, url) => {
          sent.push({ email, url });
          return Promise.resolve();
        },
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { token: string | null };
    expect(body.token).toBeNull();
    expect(sent.map((s) => s.email)).toEqual(["ada@example.test"]);
    expect(sent[0]?.url).toContain(`${BASE_URL}/api/auth/verify-email`);
  });

  it("rejects requests from an origin it does not trust", async () => {
    const instance = await auth();
    const response = await instance.handler(
      new Request(`${BASE_URL}/api/auth/sign-up/email`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://evil.example.test",
          cookie: "x=1",
        },
        body: JSON.stringify({
          name: "Eve",
          email: "eve@example.test",
          password: "a-long-test-password",
        }),
      }),
    );
    expect(response.status).toBe(403);
  });
});
