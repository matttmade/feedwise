/**
 * Guest previews: sign in anonymously (a Supabase session in cookies, no email) instead of
 * by magic link. On for Vercel preview deployments, and anywhere ALLOW_GUEST=true.
 * Production stays email-only unless ALLOW_GUEST is set there too.
 */
export function guestAllowed(): boolean {
  return process.env.ALLOW_GUEST === "true" || process.env.VERCEL_ENV === "preview";
}

/** A same-site path to return to after signing in; anything else falls back to Today. */
export function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/today";
}
