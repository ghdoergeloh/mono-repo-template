import { expect, test } from "@playwright/test";

import { account, signUp } from "../src/api";

test("a new user signs up, sees the greeting and signs out", async ({
  page,
}) => {
  const user = account();
  await page.goto("/signup");
  await page.getByLabel("Name").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign Up" }).click();

  await expect(
    page.getByRole("heading", { name: "Welcome home" }),
  ).toBeVisible();
  await expect(page.getByText(`Hello, ${user.name}!`)).toBeVisible();

  await page.getByRole("button", { name: "Sign Out" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("an existing user signs in", async ({ page }) => {
  const user = await signUp(page);
  await page.context().clearCookies();

  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.getByText(`Hello, ${user.name}!`)).toBeVisible();
});

test("a wrong password shows an error and keeps the user out", async ({
  page,
}) => {
  const user = await signUp(page);
  await page.context().clearCookies();

  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.getByText(/invalid/i)).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});
