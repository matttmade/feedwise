"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createHighlightWithCard, rebuildCard } from "@/lib/srs/cards";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Save a passage or an image from the Reader. It becomes a recall card. */
export async function addHighlight(
  itemId: string,
  input: { text?: string; imageUrl?: string },
): Promise<{ highlightId: string }> {
  if (!UUID.test(itemId)) throw new Error("Bad item id");
  const text = input.text?.replace(/\s+/g, " ").trim().slice(0, 2000) || null;
  const imageUrl = input.imageUrl && /^https?:\/\//.test(input.imageUrl) ? input.imageUrl : null;
  if (!text && !imageUrl) throw new Error("Nothing to highlight");
  const user = await requireUser();
  const supabase = await createClient();
  const { highlightId } = await createHighlightWithCard(supabase, user.id, itemId, {
    text,
    imageUrl,
  });
  refresh();
  return { highlightId };
}

export async function setHighlightNote(highlightId: string, note: string): Promise<void> {
  if (!UUID.test(highlightId)) throw new Error("Bad highlight id");
  await requireUser();
  const supabase = await createClient();
  await supabase
    .from("highlights")
    .update({ note: note.trim().slice(0, 1000) || null })
    .eq("id", highlightId);
  await rebuildCard(supabase, highlightId);
  refresh();
}

export type HighlightSnapshot = {
  id: string;
  item_id: string;
  text: string | null;
  image_url: string | null;
  note: string | null;
  created_at: string;
  cards: {
    id: string;
    prompt: string;
    answer: string;
    fsrs: unknown;
    last_review_at: string | null;
  }[];
};

/** Remove a highlight and its card. Returns everything needed to put both back exactly. */
export async function removeHighlight(highlightId: string): Promise<HighlightSnapshot | null> {
  if (!UUID.test(highlightId)) throw new Error("Bad highlight id");
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("highlights")
    .select(
      "id, item_id, text, image_url, note, created_at, cards(id, prompt, answer, fsrs, last_review_at)",
    )
    .eq("id", highlightId)
    .maybeSingle();
  if (!data) return null;
  await supabase.from("highlights").delete().eq("id", highlightId);
  refresh();
  return data as HighlightSnapshot;
}

export async function restoreHighlight(snapshot: HighlightSnapshot): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  const { cards, ...h } = snapshot;
  await supabase.from("highlights").insert({ ...h, user_id: user.id });
  if (cards.length) {
    await supabase.from("cards").insert(
      cards.map((c) => ({
        ...c,
        fsrs: c.fsrs as never,
        user_id: user.id,
        highlight_id: snapshot.id,
      })),
    );
  }
  refresh();
}
