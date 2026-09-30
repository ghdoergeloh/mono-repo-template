import type { ContractRouterClient } from "@orpc/contract";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryClient } from "@tanstack/react-query";

import type { Contract } from "@repo/contract";
import { RPC_PATH } from "@repo/contract";

// The API serves the SPA on the same origin; in development the Vite dev
// server forwards /api to it. The session cookie goes along by default.
const link = new RPCLink({
  url: new URL(RPC_PATH, globalThis.location.origin).toString(),
});

/** Typed oRPC client for the API contract. */
const client: ContractRouterClient<Contract> = createORPCClient(link);

/** TanStack Query helpers, e.g. `useQuery(orpc.user.hello.queryOptions())`. */
export const orpc = createTanstackQueryUtils(client);

export const queryClient = new QueryClient();
