import type { SubmitEvent } from "react";
import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { Button } from "@repo/ui/Button";
import { TextField } from "@repo/ui/TextField";

import { authClient } from "~/lib/auth";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { data, error } = await authClient.signUp.email({
      name,
      email,
      password,
    });

    setIsPending(false);

    if (error) {
      setError(error.message ?? "Sign up failed");
      return;
    }

    // Without email verification (no SMTP_HOST), sign-up signs the user in.
    if (data.token) {
      await navigate({ to: "/" });
      return;
    }
    setEmailSent(true);
  }

  if (emailSent) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-muted-foreground text-sm">
            We sent you a verification link. Please check your inbox and click
            the link to verify your account.
          </p>
          <p className="text-sm">
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold">Sign Up</h1>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField label="Name" name="name" isRequired autoComplete="name" />
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
            autoComplete="new-password"
          />
          <Button type="submit" isPending={isPending}>
            Sign Up
          </Button>
        </form>
        <p className="text-sm">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
