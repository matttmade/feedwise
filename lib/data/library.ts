import "server-only";
import { requireUser } from "@/lib/auth";
import { proxiedImage } from "@/lib/images";
import { createClient } from "@/lib/supabase/server";
import { CARD_COLUMNS, toCard, type CardItem } from "./feed";

export type LibraryHighlight = {
  id: string;
  text: string | null;
  image: string | null;
  note: string | null;
  itemId: string;
  itemTitle: string;
  sourceTitle: string;
};

export type LibraryData = { kept: CardItem[]; highlights: LibraryHighlight[]; limited: boolean };

const LIMIT = 60;

/** Strip characters that mean something inside a PostgREST filter. */
const term = (q: string) =>
  q
    .replace(/[%,()*\\]/g, " ")
    .trim()
    .slice(0, 80);

export async function getLibrary(filter: { q?: string; topic?: string }): Promise<LibraryData> {
  const user = await requireUser();
  const supabase = await createClient();
  const q = filter.q ? term(filter.q) : "";

  let kept = supabase
    .from("feed_items")
    .select(CARD_COLUMNS)
    .eq("state", "kept")
    .order("kept_at", { ascending: false })
    .limit(LIMIT + 1);
  if (filter.topic) kept = kept.contains("topic_ids", [filter.topic]);
  if (q) kept = kept.or(`title.ilike.%${q}%,summary.ilike.%${q}%`);

  let highlights = supabase
    .from("highlights")
    .select("id, text, image_url, note, items!inner(id, title, sources!inner(title, topic_ids))")
    .eq("user_id", user.id)
    .or("text.not.is.null,image_url.not.is.null")
    .order("created_at", { ascending: false })
    .limit(LIMIT + 1);
  if (filter.topic) highlights = highlights.contains("items.sources.topic_ids", [filter.topic]);
  if (q) highlights = highlights.or(`text.ilike.%${q}%,note.ilike.%${q}%`);

  const [k, h] = await Promise.all([kept, highlights]);
  const keptRows = (k.data ?? []).map(toCard);
  const highlightRows = (h.data ?? []).map((r) => ({
    id: r.id,
    text: r.text,
    image: r.image_url ? proxiedImage(r.image_url, 320) : null,
    note: r.note,
    itemId: r.items.id,
    itemTitle: r.items.title,
    sourceTitle: r.items.sources.title ?? "",
  }));
  return {
    kept: keptRows.slice(0, LIMIT),
    highlights: highlightRows.slice(0, LIMIT),
    limited: keptRows.length > LIMIT || highlightRows.length > LIMIT,
  };
}
