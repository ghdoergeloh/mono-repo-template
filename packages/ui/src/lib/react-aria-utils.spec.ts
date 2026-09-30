import { describe, expect, it } from "vitest";

import { composeTailwindRenderProps, focusRing } from "./react-aria-utils";

/** Resolves a `className` prop the way React Aria does. */
function resolve<T>(className: string | ((v: T) => string), values: T) {
  return typeof className === "function" ? className(values) : className;
}

describe("composeTailwindRenderProps", () => {
  it("lets the classes of the caller win over the defaults", () => {
    const className = composeTailwindRenderProps("p-4", "p-2 text-sm");
    expect(resolve(className, {})).toBe("text-sm p-4");
  });

  it("resolves a class function with the render props", () => {
    const className = composeTailwindRenderProps<{ isDisabled: boolean }>(
      ({ isDisabled }) => (isDisabled ? "opacity-50" : ""),
      "p-2",
    );
    expect(resolve(className, { isDisabled: true })).toBe("p-2 opacity-50");
  });
});

describe("focusRing", () => {
  it("shows the ring only for keyboard focus", () => {
    expect(focusRing({ isFocusVisible: true })).toContain("outline-2");
    expect(focusRing({ isFocusVisible: false })).toContain("outline-0");
  });
});
