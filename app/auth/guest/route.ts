import { NextResponse, type NextRequest } from "next/server";
import { guestAllowed, safeNext } from "@/lib/guest";
import { createClient } from "@/lib/supabase/server";

/** Starts a guest preview: an anonymous Supabase session, kept in cookies like any other. */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  if (!guestAllowed()) return NextResponse.redirect(new URL("/login", origin));

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error("guest sign-in failed", error.code, error.status, error.message);
      // Pass Supabase's error code along so the sign-in page can say what to change.
      const url = new URL("/login?error=guest", origin);
      url.searchParams.set("reason", error.code ?? String(error.status ?? "unknown"));
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.redirect(new URL(safeNext(searchParams.get("next")), origin));
}
