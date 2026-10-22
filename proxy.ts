import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { guestAllowed } from "@/lib/guest";

const PUBLIC_PATHS = ["/login", "/auth/", "/help"];

/**
 * Refreshes the Supabase session cookie on every page request. Without a session: previews
 * start a guest session, everywhere else goes to /login.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet, headers) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const path = request.nextUrl.pathname;
  if (!data?.claims && !PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.search = "";
    if (guestAllowed()) {
      url.pathname = "/auth/guest";
      url.searchParams.set("next", path + request.nextUrl.search);
    } else {
      url.pathname = "/login";
    }
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // Skip static assets, the image proxy and the cron route (it has its own bearer auth).
  matcher: ["/((?!_next/static|_next/image|api/|favicon.ico|icon|apple-icon|manifest).*)"],
};
