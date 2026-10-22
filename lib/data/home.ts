import "server-only";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CARD_COLUMNS, UNHANDLED, freshSince, toCard, type CardItem } from "./feed";

export type HomeQuote = { text: string; itemId: string; itemTitle: string; sourceTitle: string };

export type HomeData = {
  /** Fresh, untouched items, newest first, for dealing into the home's sections. */
  pool: CardItem[];
  stats: { kept: number; highlights: number; sources: number };
  quotes: HomeQuote[];
};

const POOL = 150;

export async function getHome(): Promise<HomeData> {
  const user = await requireUser();
  const supabase = await createClient();
  const [pool, kept, highlights, sources, quotes] = await Promise.all([
    supabase
      .from("feed_items")
      .select(CARD_COLUMNS)
      .eq("muted", false)
      .or(UNHANDLED)
      .gte("sort_at", freshSince())
      .order("sort_at", { ascending: false })
      .limit(POOL),
    supabase
      .from("user_items")
      .select("item_id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("state", "kept"),
    supabase
      .from("highlights")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .or("text.not.is.null,image_url.not.is.null"),
    supabase.from("sources").select("id", { count: "exact", head: true }),
    supabase
      .from("highlights")
      .select("text, items!inner(id, title, sources!inner(title))")
      .eq("user_id", user.id)
      .not("text", "is", null)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  return {
    pool: (pool.data ?? []).map(toCard),
    stats: {
      kept: kept.count ?? 0,
      highlights: highlights.count ?? 0,
      sources: sources.count ?? 0,
    },
    quotes: (quotes.data ?? [])
      .filter((q) => q.text && q.text.length > 20)
      .map((q) => ({
        text: q.text!,
        itemId: q.items.id,
        itemTitle: q.items.title,
        sourceTitle: q.items.sources.title ?? "",
      })),
  };
}
