import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export type CurrentUser = { id: string; email: string };

/** The signed-in user, or a redirect to /login. Deduped per request. */
export const requireUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  return { id: claims.sub, email: String(claims.email ?? "") };
});

function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Email links are only offered when ALLOWED_EMAILS lists someone (local dev, the owner). */
export function emailSignInEnabled(): boolean {
  return allowedEmails().length > 0;
}

/** Only these addresses may sign in by email link. Google sign-in is open to anyone. */
export function isAllowedEmail(email: string): boolean {
  return allowedEmails().includes(email.trim().toLowerCase());
}
