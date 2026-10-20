import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4 py-12"
    >
      <div>
        <p className="text-sm font-bold tracking-wide text-accent uppercase">Feedwise</p>
        <h1 className="mt-2 text-2xl font-bold">Welcome back.</h1>
        <p className="mt-2 text-muted">No password — we&apos;ll email you a link.</p>
      </div>
      <Suspense fallback={null}>
        <LinkProblem searchParams={searchParams} />
      </Suspense>
      <LoginForm />
    </main>
  );
}

async function LinkProblem({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <p className="rounded-card bg-warn-soft p-4" role="alert">
      That link has expired or was already used. Ask for a fresh one below.
    </p>
  );
}
