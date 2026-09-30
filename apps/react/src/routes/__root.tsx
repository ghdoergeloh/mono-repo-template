import {
  createRootRoute,
  Link,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { Button } from "@repo/ui/Button";

import { ThemeToggle } from "~/components/ThemeToggle";
import { authClient } from "~/lib/auth";

const RootLayout = () => {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  return (
    <>
      <header className="border-border flex items-center justify-between gap-2 border-b p-2">
        <nav aria-label="Main" className="flex gap-2">
          <Link to="/" className="[&.active]:font-bold">
            Home
          </Link>{" "}
          <Link to="/about" className="[&.active]:font-bold">
            About
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isPending ? null : session?.user ? (
            <>
              <span className="text-sm">{session.user.email}</span>
              <Button
                variant="secondary"
                onPress={async () => {
                  await authClient.signOut();
                  await navigate({ to: "/login" });
                }}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Link to="/login">Sign In</Link>
          )}
        </div>
      </header>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  );
};

export const Route = createRootRoute({ component: RootLayout });
