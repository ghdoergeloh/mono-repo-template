import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { WEB_URL } from "./env";

export interface TestAccount {
  name: string;
  email: string;
  password: string;
}

/** A new, invented test account per call. */
export function account(): TestAccount {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return {
    name: "Robin Example",
    email: `robin-${id}@example.test`,
    password: "a-long-test-password",
  };
}

/**
 * Signs a new account up over the API; the page gets its session cookie.
 * Faster than the form, for tests that are about other screens. When the
 * account exists (a retry of the same test), it signs in instead.
 */
export async function signUp(page: Page, user = account()) {
  const headers = { Origin: WEB_URL };
  const signedUp = await page.request.post("/api/auth/sign-up/email", {
    data: user,
    headers,
  });
  if (signedUp.ok()) return user;
  const signedIn = await page.request.post("/api/auth/sign-in/email", {
    data: { email: user.email, password: user.password },
    headers,
  });
  expect(signedIn.ok(), await signedUp.text()).toBe(true);
  return user;
}
