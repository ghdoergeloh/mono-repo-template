import { describe, expect, it } from "vitest";

import { contract } from "./index";
import { listProcedures } from "./procedures";

const procedures = listProcedures(contract);

describe("contract", () => {
  it("lists every procedure", () => {
    expect(procedures.map((p) => p.name)).toContain("user.me");
  });

  it("gives every procedure its own method and path", () => {
    const routes = procedures.map(
      (p) =>
        `${p.procedure["~orpc"].route.method} ${p.procedure["~orpc"].route.path}`,
    );
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("declares an output schema for every procedure", () => {
    const missing = procedures
      .filter((p) => !p.procedure["~orpc"].outputSchema)
      .map((p) => p.name);
    expect(missing).toEqual([]);
  });
});
