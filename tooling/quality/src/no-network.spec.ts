import net from "node:net";
import { describe, expect, it } from "vitest";

describe("unit tests cannot reach the network", () => {
  it("fetch to an outside host fails at once", async () => {
    await expect(fetch("https://example.com/v1/models")).rejects.toThrow(
      "Unit tests must not reach the network: example.com",
    );
  });

  it("a socket to an outside host fails at once", () => {
    expect(() => net.connect({ host: "203.0.113.7", port: 443 })).toThrow(
      "Unit tests must not reach the network: 203.0.113.7",
    );
    expect(() => net.connect(443, "api.example.com")).toThrow(
      /api\.example\.com/,
    );
  });

  it("this machine stays reachable", async () => {
    // Nothing listens on port 9: the error is a refused connection, not a block.
    await expect(fetch("http://127.0.0.1:9/")).rejects.toThrow(/fetch failed/);
    const socket = net.connect({ host: "localhost", port: 9 });
    await new Promise<void>((resolve) => {
      socket.on("error", () => resolve());
    });
  });
});
