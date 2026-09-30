import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import type { AppDeps } from "./app";
import { createApp, MAX_BODY_BYTES } from "./app";

const spaDir = mkdtempSync(join(tmpdir(), "spa-"));
mkdirSync(join(spaDir, "assets"));
writeFileSync(join(spaDir, "index.html"), "<html><body>SPA</body></html>");
writeFileSync(join(spaDir, "assets", "app-1a2b3c.js"), "console.log(1)");
writeFileSync(join(spaDir, ".env"), "SECRET=1");
writeFileSync(join(spaDir, "assets", ".secret"), "1");

afterAll(() => {
  rmSync(spaDir, { recursive: true, force: true });
});

function app(deps: Partial<AppDeps> = {}) {
  return createApp({
    trustedOrigins: ["http://localhost:5173"],
    spaDir: null,
    ready: () => Promise.resolve(true),
    auth: () => Promise.resolve(Response.json({ from: "auth" })),
    rpc: () => Promise.resolve(Response.json({ from: "rpc" })),
    ...deps,
  });
}

describe("probes", () => {
  it("answers /health without any dependency", async () => {
    const response = await app({
      ready: () => Promise.reject(new Error("database down")),
    }).request("/health");
    expect(response.status).toBe(200);
  });

  it("answers /ready with 503 while the database does not answer", async () => {
    const down = app({ ready: () => Promise.reject(new Error("down")) });
    expect((await down.request("/ready")).status).toBe(503);
    expect((await app().request("/ready")).status).toBe(200);
  });
});

describe("API routes", () => {
  it("passes /api/auth to better-auth and /api/rpc to oRPC", async () => {
    const auth = await app().request("/api/auth/get-session");
    const rpc = await app().request("/api/rpc/user/me", { method: "POST" });
    expect(await auth.json()).toEqual({ from: "auth" });
    expect(await rpc.json()).toEqual({ from: "rpc" });
  });

  it("answers 404 for unknown procedures and API paths", async () => {
    const unknownRpc = app({ rpc: () => Promise.resolve(null) });
    expect((await unknownRpc.request("/api/rpc/nope")).status).toBe(404);
    expect((await app().request("/api/nope")).status).toBe(404);
  });

  it("allows credentials only for trusted origins", async () => {
    const trusted = await app().request("/api/rpc/user/me", {
      headers: { origin: "http://localhost:5173" },
    });
    const other = await app().request("/api/rpc/user/me", {
      headers: { origin: "https://evil.example.test" },
    });
    expect(trusted.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:5173",
    );
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("rejects bodies above the limit", async () => {
    const response = await app().request("/api/rpc/user/me", {
      method: "POST",
      headers: { "content-length": String(MAX_BODY_BYTES + 1) },
      body: "x".repeat(MAX_BODY_BYTES + 1),
    });
    expect(response.status).toBe(413);
  });
});

describe("SPA", () => {
  it("serves index.html for client-side routes, uncached", async () => {
    const response = await app({ spaDir }).request("/some/route");
    expect(await response.text()).toContain("SPA");
    expect(response.headers.get("cache-control")).toBe("no-cache");
  });

  it.each(["/", "/index.html"])(
    "revalidates %s on every load",
    async (path) => {
      const response = await app({ spaDir }).request(path);
      expect(await response.text()).toContain("SPA");
      expect(response.headers.get("cache-control")).toBe("no-cache");
    },
  );

  it("serves hashed assets with a long cache time", async () => {
    const response = await app({ spaDir }).request("/assets/app-1a2b3c.js");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("immutable");
  });

  it.each(["/assets/app-old999.js", "/favicon.ico"])(
    "answers 404 for the missing file %s, never HTML",
    async (path) => {
      const response = await app({ spaDir }).request(path);
      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBeNull();
    },
  );

  it("serves no dotfiles", async () => {
    expect((await app({ spaDir }).request("/.env")).status).toBe(404);
    expect((await app({ spaDir }).request("/assets/.secret")).status).toBe(404);
  });

  it("is off when Vite serves the SPA", async () => {
    expect((await app().request("/some/route")).status).toBe(404);
  });
});
