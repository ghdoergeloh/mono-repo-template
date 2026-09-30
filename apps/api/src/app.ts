import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";

import { RPC_PATH } from "@repo/contract";

/** Largest request body the API accepts. */
export const MAX_BODY_BYTES = 1024 * 1024;

export interface AppDeps {
  /** Origins that may call `/api` with credentials from another origin. */
  trustedOrigins: string[];
  /** Directory of the built SPA; null when Vite serves it. */
  spaDir: string | null;
  /** True when the app can serve requests, e.g. the database answers. */
  ready: () => Promise<boolean>;
  /** better-auth under `/api/auth/*`. */
  auth: (request: Request) => Promise<Response>;
  /** oRPC under `/api/rpc/*`; null when no procedure matches. */
  rpc: (request: Request) => Promise<Response | null>;
}

/**
 * The HTTP app: API, probes and the SPA on one origin. Everything it talks
 * to comes in as a dependency, so tests run it without a server.
 */
export function createApp(deps: AppDeps): Hono {
  const app = new Hono();

  // Liveness: the process runs. Readiness: it can serve requests.
  app.get("/health", (c) => c.json({ status: "ok" }));
  app.get("/ready", async (c) => {
    const ok = await deps.ready().catch(() => false);
    return c.json({ status: ok ? "ok" : "unavailable" }, ok ? 200 : 503);
  });

  app.use(
    "/api/*",
    cors({ origin: deps.trustedOrigins, credentials: true }),
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: (c) => c.json({ message: "Request body too large" }, 413),
    }),
  );
  app.on(["GET", "POST"], "/api/auth/*", (c) => deps.auth(c.req.raw));
  app.all(
    `${RPC_PATH}/*`,
    async (c) =>
      (await deps.rpc(c.req.raw)) ?? c.json({ message: "Not found" }, 404),
  );
  app.all("/api/*", (c) => c.json({ message: "Not found" }, 404));

  if (deps.spaDir) {
    const root = deps.spaDir;
    // No dotfiles, even if the build puts one into the SPA directory.
    app.use("*", async (c, next) => {
      if (c.req.path.split("/").some((segment) => segment.startsWith(".")))
        return c.notFound();
      await next();
    });
    app.use(
      "*",
      serveStatic({
        root,
        onFound: (path, c) => {
          // Vite puts a content hash into every file name under /assets.
          // index.html is revalidated on every load, so a deploy is seen
          // at once. The response exists already when this runs.
          c.res.headers.set(
            "Cache-Control",
            path.includes("/assets/") && !path.endsWith(".html")
              ? "public, max-age=31536000, immutable"
              : "no-cache",
          );
        },
      }),
    );
    // Client-side routes get index.html. A missing file (a path with an
    // extension, such as an old asset after a deploy) gets 404 instead,
    // so no cache keeps HTML as a script.
    app.get("*", async (c) => {
      const last = c.req.path.split("/").pop() ?? "";
      if (c.req.path.startsWith("/assets/") || last.includes("."))
        return c.notFound();
      const html = await readFile(join(root, "index.html"), "utf8");
      c.header("Cache-Control", "no-cache");
      return c.html(html);
    });
  }

  return app;
}
