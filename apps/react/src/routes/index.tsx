import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "~/lib/auth";
import { orpc } from "~/lib/orpc";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (!session) {
      // oxlint-disable-next-line typescript/only-throw-error
      throw redirect({ to: "/login" });
    }
  },
  component: Index,
});

function Index() {
  const hello = useQuery(orpc.user.hello.queryOptions());

  return (
    <main className="space-y-2 p-4">
      <h1 className="text-2xl font-bold">Welcome home</h1>
      <p>
        {hello.data?.message ?? (hello.isError ? "API not reachable" : "…")}
      </p>
    </main>
  );
}
