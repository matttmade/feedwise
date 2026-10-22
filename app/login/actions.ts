"use server";

import { headers } from "next/headers";
import { isAllowedEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string; email?: string };

export async function sendMagicLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "That doesn't look like an email address yet.", email };
  }
  // Same reply whether or not the address is allowed, so the form doesn't reveal who has access.
  if (isAllowedEmail(email)) {
    const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/confirm`, shouldCreateUser: true },
    });
    if (error) {
      console.error("magic link failed", error.message);
      return {
        status: "error",
        message: "We couldn't send the link just now. Try again in a minute.",
        email,
      };
    }
  }
  return { status: "sent", email };
}
