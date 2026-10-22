import "server-only";
import { requireUser } from "@/lib/auth";
import type { Signal } from "@/lib/feed/rank";
import { createClient } from "@/lib/supabase/server";
import { CARD_COLUMNS, UNHANDLED, freshSince, toCard, type CardItem } from "./feed";

export type HomeQuote = { text: string; itemId: string; itemTitle: string; sourceTitle: string };

export type HomeData = {
  /** Fresh, untouched items, newest first, for ranking and dealing into sections. */
  pool: CardItem[];
  /** What you've opened, read, kept or skipped lately: the ranking's taste signals. */
  signals: Signal[];
  quotes: HomeQuote[];
};

const POOL = 150;
const SIGNAL_DAYS = 120;

export async function getHome(): Promise<HomeData> {
  const user = await requireUser();
  const supabase = await createClient();
  const since = new Date(Date.now() - SIGNAL_DAYS * 86_400_000).toISOString();
  const [pool, engaged, quotes] = await Promise.all([
    supabase
      .from("feed_items")
      .select(CARD_COLUMNS)
      .eq("muted", false)
      .or(UNHANDLED)
      .gte("sort_at", freshSince())
      .order("sort_at", { ascending: false })
      .limit(POOL),
    supabase
      .from("feed_items")
      .select("source_id, topic_ids, state, last_opened_at, resume_position")
      .or("state.in.(kept,skipped,read),last_opened_at.not.is.null")
      .gte("sort_at", since)
      .limit(400),
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
    signals: (engaged.data ?? []).map((r) => ({
      sourceId: r.source_id ?? "",
      topicIds: r.topic_ids ?? [],
      opened: Boolean(r.last_opened_at) || r.state === "read",
      progress: r.state === "read" ? 1 : (r.resume_position ?? 0),
      kept: r.state === "kept",
      skipped: r.state === "skipped",
    })),
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
