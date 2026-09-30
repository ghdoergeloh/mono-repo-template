import type { AnyContractProcedure, AnyContractRouter } from "@orpc/contract";
import { isContractProcedure } from "@orpc/contract";

/** One procedure of a contract with its dotted name, e.g. `user.me`. */
export interface NamedProcedure {
  name: string;
  /** The segments of the RPC path, e.g. `["user", "me"]`. */
  path: string[];
  procedure: AnyContractProcedure;
}

/** Every procedure of a contract router, depth first. */
export function listProcedures(
  router: AnyContractRouter,
  prefix: string[] = [],
): NamedProcedure[] {
  if (isContractProcedure(router))
    return [{ name: prefix.join("."), path: prefix, procedure: router }];
  return Object.entries(router).flatMap(([key, child]) =>
    listProcedures(child as AnyContractRouter, [...prefix, key]),
  );
}
