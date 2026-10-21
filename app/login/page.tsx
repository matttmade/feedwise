import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col justify-center gap-(--s-5) px-(--gutter) py-(--s-5) lg:grid-12 lg:content-center"
    >
      <div className="lg:col-span-6">
        <p className="font-semibold">
          Feed<em className="font-normal">wise</em>
        </p>
        <h1 className="t-display mt-(--s-4)">
          Welcome <em>back</em>.
        </h1>
        <p className="mt-(--s-3)">No password — we&apos;ll email you a link.</p>
      </div>
      <div className="flex flex-col gap-(--s-4) lg:col-span-4 lg:col-start-8">
        <Suspense fallback={null}>
          <LinkProblem searchParams={searchParams} />
        </Suspense>
        <LoginForm />
      </div>
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
    <p className="border-t border-rule pt-(--s-2)" role="alert">
      That link has expired or was already used. Ask for a fresh one below.
    </p>
  );
}
