import { describe, expect, it } from "vitest";

import { assertThrowaway, e2eDatabaseUrl } from "./env";

describe("e2e environment", () => {
  it("points the API to the throwaway database on the admin server", () => {
    expect(
      e2eDatabaseUrl("postgresql://u:p@localhost:5432/postgres", "app_e2e"),
    ).toBe("postgresql://u:p@localhost:5432/app_e2e");
  });

  it("refuses to drop a database that is not a throwaway one", () => {
    expect(() => assertThrowaway("app")).toThrow(/_e2e/);
    expect(() => assertThrowaway("postgres")).toThrow(/_e2e/);
    expect(() => assertThrowaway("app_e2e")).not.toThrow();
    expect(() => assertThrowaway("app_e2e_worktree2")).not.toThrow();
  });
});
