import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/guest";
import { createClient } from "@/lib/supabase/server";

/** Starts Google sign-in: Supabase hands back Google's consent page, which returns to /auth/confirm. */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const back = new URL("/auth/confirm", origin);
  back.searchParams.set("next", safeNext(searchParams.get("next")));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: back.toString() },
  });
  if (error || !data.url) {
    console.error("google sign-in failed", error?.code, error?.message);
    const url = new URL("/login?error=google", origin);
    url.searchParams.set("reason", error?.code ?? "unknown");
    return NextResponse.redirect(url);
  }
  return NextResponse.redirect(data.url);
}
