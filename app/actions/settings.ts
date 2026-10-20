"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { PREFS_COOKIE, normalisePrefs, prefsCookieValue, type Prefs } from "@/lib/prefs";
import { createClient } from "@/lib/supabase/server";

/** Save every dial at once. The cookie lets the next page load apply them before paint. */
export async function savePrefs(input: Partial<Record<keyof Prefs, unknown>>): Promise<Prefs> {
  const user = await requireUser();
  const prefs = normalisePrefs(input);
  const supabase = await createClient();
  const { error } = await supabase.from("settings").upsert({
    user_id: user.id,
    density: prefs.density,
    motion: prefs.motion,
    autoplay: prefs.autoplay,
    captions: prefs.captions,
    text_size: prefs.textSize,
    daily_goal: prefs.dailyGoal,
    review_cap: prefs.reviewCap,
    calm_mode: prefs.calmMode,
  });
  if (error) throw new Error(error.message);
  (await cookies()).set(PREFS_COOKIE, prefsCookieValue(prefs), {
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
    sameSite: "lax",
  });
  refresh();
  return prefs;
}
