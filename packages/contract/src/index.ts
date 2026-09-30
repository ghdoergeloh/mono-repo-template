import { oc } from "@orpc/contract";
import { z } from "zod";

export { listProcedures } from "./procedures";
export type { NamedProcedure } from "./procedures";

/** Path under which the API serves the contract (oRPC protocol). */
export const RPC_PATH = "/api/rpc";

const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});

export const contract = oc.router({
  user: oc.router({
    me: oc
      .route({
        method: "GET",
        path: "/user/me",
      })
      .output(z.object({ user: userSchema.nullable() })),
    hello: oc
      .route({
        method: "GET",
        path: "/user/hello",
      })
      .output(z.object({ message: z.string() })),
  }),
});

export type Contract = typeof contract;
