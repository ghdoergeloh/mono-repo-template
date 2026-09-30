import net from "node:net";
import { describe, expect, it } from "vitest";

describe("the network guard of the unit tests", () => {
  it("rejects fetch to another host", async () => {
    await expect(fetch("https://example.com/")).rejects.toThrow(
      /must not reach the network: example.com/,
    );
  });

  it("rejects sockets to another host", () => {
    expect(() => net.connect({ host: "example.com", port: 443 })).toThrow(
      /must not reach the network/,
    );
  });

  it("lets connections to this machine through", async () => {
    const server = net.createServer((socket) => socket.end("hi"));
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const { port } = server.address() as net.AddressInfo;
    const reply = await new Promise<string>((resolve, reject) => {
      const socket = net.connect({ host: "127.0.0.1", port });
      socket.on("data", (data) => resolve(data.toString()));
      socket.on("error", reject);
    });
    server.close();
    expect(reply).toBe("hi");
  });
});
