import { initAuthClient } from "@repo/auth/client";

/** The better-auth client; the API is on the origin of the page. */
export const authClient = initAuthClient({
  baseUrl: globalThis.location.origin,
});
