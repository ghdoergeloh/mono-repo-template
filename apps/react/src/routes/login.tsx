import type { SubmitEvent } from "react";
import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { Button } from "@repo/ui/Button";
import { TextField } from "@repo/ui/TextField";

import { authClient } from "../lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendPending, setResendPending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setShowResend(false);
    setResendSuccess(false);
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await authClient.signIn.email({
      email,
      password,
    });

    setIsPending(false);

    if (error) {
      if (error.status === 403) {
        setError("Please verify your email address before signing in.");
        setShowResend(true);
        setResendEmail(email);
      } else {
        setError(error.message ?? "Sign in failed");
      }
      return;
    }

    await navigate({ to: "/" });
  }

  async function handleResend() {
    setResendPending(true);
    setResendSuccess(false);

    await authClient.sendVerificationEmail({
      email: resendEmail,
      callbackURL: "/",
    });

    setResendPending(false);
    setResendSuccess(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold">Sign In</h1>
        {error && (
          <div className="space-y-2">
            <p className="text-destructive text-sm">{error}</p>
            {showResend && (
              <div>
                {resendSuccess ? (
                  <p className="text-success text-sm">
                    Verification email sent! Check your inbox.
                  </p>
                ) : (
                  <Button
                    variant="secondary"
                    onPress={handleResend}
                    isPending={resendPending}
                  >
                    Resend verification email
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            label="Email"
            name="email"
            type="email"
            isRequired
            autoComplete="email"
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            isRequired
            autoComplete="current-password"
          />
          <Button type="submit" isPending={isPending}>
            Sign In
          </Button>
        </form>
        <p className="text-sm">
          Don&apos;t have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </main>
  );
}
