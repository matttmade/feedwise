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
      console.error("guest sign-in failed", error.message);
      return NextResponse.redirect(new URL("/login?error=guest", origin));
    }
  }
  return NextResponse.redirect(new URL(safeNext(searchParams.get("next")), origin));
}
