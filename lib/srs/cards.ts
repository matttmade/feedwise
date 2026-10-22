import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { startOfDay } from "@/lib/feed/select";
import { newCardState, type StoredFsrs } from "./fsrs";
import { buildPrompt } from "./prompts";

type Db = SupabaseClient<Database>;

export const timeZone = () => process.env.APP_TIMEZONE || "UTC";

/** Today's date in the user's time zone, as stored in `activity.day`. */
export function localDay(now = new Date()): string {
  return startOfDay(now, timeZone()).toLocaleDateString("en-CA", { timeZone: timeZone() });
}

/** New cards first come back tomorrow: recall works best after a night's gap. */
export function firstDue(now: Date): StoredFsrs {
  const tomorrow = new Date(startOfDay(now, timeZone()).getTime() + 86_400_000);
  return { ...newCardState(now), due: tomorrow.toISOString() };
}

type HighlightInput = { text?: string | null; imageUrl?: string | null; note?: string | null };

/** A highlight and the recall card made from it. Returns both ids (for Undo). */
export async function createHighlightWithCard(
  db: Db,
  userId: string,
  itemId: string,
  h: HighlightInput,
): Promise<{ highlightId: string; cardId: string }> {
  const { data: item, error: itemError } = await db
    .from("items")
    .select("title, summary")
    .eq("id", itemId)
    .single();
  if (itemError || !item) throw new Error("Item not found");

  const { data: highlight, error } = await db
    .from("highlights")
    .insert({
      user_id: userId,
      item_id: itemId,
      text: h.text ?? null,
      image_url: h.imageUrl ?? null,
      note: h.note ?? null,
    })
    .select("id")
    .single();
  if (error || !highlight) throw new Error(error?.message ?? "Highlight not saved");

  const prompt = buildPrompt({ itemTitle: item.title, ...h, fallbackAnswer: item.summary });
  const { data: card, error: cardError } = await db
    .from("cards")
    .insert({
      user_id: userId,
      highlight_id: highlight.id,
      prompt: prompt.prompt,
      answer: prompt.answer,
      fsrs: firstDue(new Date()),
    })
    .select("id")
    .single();
  if (cardError || !card) throw new Error(cardError?.message ?? "Card not saved");
  return { highlightId: highlight.id, cardId: card.id };
}

/** After a note changes, rebuild the card's prompt and answer (its schedule is untouched). */
export async function rebuildCard(db: Db, highlightId: string): Promise<void> {
  const { data: h } = await db
    .from("highlights")
    .select("text, image_url, note, items(title, summary)")
    .eq("id", highlightId)
    .single();
  if (!h || !h.items) return;
  const p = buildPrompt({
    itemTitle: h.items.title,
    text: h.text,
    imageUrl: h.image_url,
    note: h.note,
    fallbackAnswer: h.items.summary,
  });
  await db
    .from("cards")
    .update({ prompt: p.prompt, answer: p.answer })
    .eq("highlight_id", highlightId);
}

/** Count today towards cumulative "days learned". Never decremented, never reset. */
export async function bumpActivity(
  db: Db,
  userId: string,
  field: "items_read" | "cards_reviewed",
  by = 1,
) {
  const day = localDay();
  const { data } = await db
    .from("activity")
    .select("items_read, cards_reviewed")
    .eq("user_id", userId)
    .eq("day", day)
    .maybeSingle();
  await db.from("activity").upsert({
    user_id: userId,
    day,
    items_read: Math.max(0, (data?.items_read ?? 0) + (field === "items_read" ? by : 0)),
    cards_reviewed: Math.max(
      0,
      (data?.cards_reviewed ?? 0) + (field === "cards_reviewed" ? by : 0),
    ),
  });
}
