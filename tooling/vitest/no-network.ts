/**
 * Setup file of the unit tests: every network access to a host other than
 * this machine fails at once. Unit tests never reach a model service, a
 * payment provider or any other outside host. Local services (PostgreSQL,
 * Mailpit) stay reachable.
 */
import net from "node:net";

const localHosts = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "0.0.0.0",
]);

function isLocal(host: string | undefined): boolean {
  return (
    host === undefined || host === "" || localHosts.has(host.toLowerCase())
  );
}

/** Error of a blocked access. */
class NetworkBlockedError extends Error {
  constructor(host: string) {
    super(`Unit tests must not reach the network: ${host}`);
    this.name = "NetworkBlockedError";
  }
}

const realFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input, init) => {
  const raw =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  const base =
    (globalThis as { location?: { href: string } }).location?.href ??
    "http://localhost/";
  const url = new URL(raw, base);
  if (!isLocal(url.hostname))
    return Promise.reject(new NetworkBlockedError(url.host));
  return realFetch(input, init);
};

const socketPrototype = net.Socket.prototype;
const realConnect = Reflect.get(socketPrototype, "connect") as (
  ...args: unknown[]
) => net.Socket;
Reflect.set(
  socketPrototype,
  "connect",
  function (this: net.Socket, ...args: unknown[]) {
    // net.connect passes the normalized arguments as one array.
    const first: unknown = Array.isArray(args[0])
      ? (args[0] as unknown[])[0]
      : args[0];
    const host =
      typeof first === "object" && first !== null
        ? "path" in first && first.path
          ? "localhost"
          : (first as { host?: string }).host
        : typeof first === "string" && Number.isNaN(Number(first))
          ? "localhost"
          : (args[1] as string | undefined);
    if (!isLocal(host)) throw new NetworkBlockedError(host ?? "");
    return realConnect.apply(this, args);
  },
);
