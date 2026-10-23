import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { emailSignInEnabled } from "@/lib/auth";
import { guestAllowed } from "@/lib/guest";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col justify-center gap-(--s-5) px-(--gutter) py-(--s-5) lg:grid-12 lg:content-center"
    >
      <div className="lg:col-span-6">
        <p>Feedwise</p>
        <h1 className="t-display mt-(--s-4)">
          Read what <em>you</em> like.
        </h1>
        <p className="mt-(--s-3) max-w-[44ch]">
          Sites you follow, in one visual feed that learns from what you open, keep and skip.
        </p>
      </div>
      <div className="flex flex-col gap-(--s-4) lg:col-span-4 lg:col-start-8">
        <Suspense fallback={null}>
          <LinkProblem searchParams={searchParams} />
        </Suspense>
        <div>
          <a href="/auth/google" className="btn">
            Continue with Google →
          </a>
          <p className="t-label mt-(--s-3) text-muted">New here? This creates your account.</p>
        </div>
        {emailSignInEnabled() && (
          <div className="border-t border-rule pt-(--s-3)">
            <LoginForm />
          </div>
        )}
        {guestAllowed() && (
          <p className="border-t border-rule pt-(--s-3)">
            <Link href="/auth/guest" prefetch={false} className="link">
              Preview without an account →
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}

async function LinkProblem({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const { error, reason } = await searchParams;
  if (!error) return null;
  return (
    <p className="border-t border-rule pt-(--s-2)" role="alert">
      {error === "guest"
        ? guestProblem(String(reason ?? ""))
        : error === "google"
          ? googleProblem(String(reason ?? ""))
          : "That sign-in didn't finish. Try again below."}
    </p>
  );
}

/** Supabase's reason for refusing a guest session, in words that say what to change. */
function guestProblem(reason: string): string {
  const fix: Record<string, string> = {
    anonymous_provider_disabled:
      "Supabase has anonymous sign-ins switched off (Authentication → Sign In / Providers).",
    signup_disabled:
      "Supabase has new sign-ups switched off, which also blocks guests (Authentication → Sign In / Providers).",
    captcha_failed:
      "Supabase is asking for a captcha. Turn off CAPTCHA protection under Authentication → Attack Protection.",
    over_request_rate_limit: "Too many guest sessions from this network. Try again in an hour.",
  };
  let project = "unknown";
  try {
    project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname.split(".")[0];
  } catch {}
  const why = fix[reason] ?? `Supabase said: ${reason || "unknown error"}.`;
  return `The guest preview didn't start. ${why} Supabase project in use: ${project}.`;
}

/** Supabase's reason for refusing Google sign-in, in words that say what to change. */
function googleProblem(reason: string): string {
  if (reason === "validation_failed" || reason === "provider_disabled")
    return "Google sign-in isn't switched on yet (Supabase → Authentication → Sign In / Providers → Google).";
  return `Google sign-in didn't start (${reason || "unknown error"}). Try again in a minute.`;
}
