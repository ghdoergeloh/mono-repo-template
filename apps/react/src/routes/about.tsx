import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  component: About,
});

function About() {
  return (
    <main className="space-y-2 p-4">
      <h1 className="text-2xl font-bold">About</h1>
      <p>This app was made from the monorepo template.</p>
    </main>
  );
}
