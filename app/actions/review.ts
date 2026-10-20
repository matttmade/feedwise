"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { bumpActivity } from "@/lib/srs/cards";
import { rate, untilLabel, type ReviewRating, type StoredFsrs } from "@/lib/srs/fsrs";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RATINGS: ReviewRating[] = ["again", "hard", "good"];

export type RatingUndo = {
  cardId: string;
  reviewId: string;
  fsrs: StoredFsrs;
  lastReviewAt: string | null;
};

/** Record an answer and reschedule the card. Returns what Undo needs, and when it's back. */
export async function rateCard(
  cardId: string,
  rating: ReviewRating,
): Promise<{ undo: RatingUndo; backIn: string }> {
  if (!UUID.test(cardId) || !RATINGS.includes(rating)) throw new Error("Bad rating");
  const user = await requireUser();
  const supabase = await createClient();
  const { data: card } = await supabase
    .from("cards")
    .select("fsrs, last_review_at")
    .eq("id", cardId)
    .single();
  if (!card) throw new Error("Card not found");

  const now = new Date();
  const before = card.fsrs as StoredFsrs;
  const next = rate(before, rating, now);
  await supabase
    .from("cards")
    .update({ fsrs: next, last_review_at: now.toISOString() })
    .eq("id", cardId);
  const { data: review } = await supabase
    .from("reviews")
    .insert({ card_id: cardId, rating, reviewed_at: now.toISOString() })
    .select("id")
    .single();
  await bumpActivity(supabase, user.id, "cards_reviewed");
  // Keeps the nav badge and Today's hero current; the session keeps its own queue.
  refresh();
  return {
    undo: { cardId, reviewId: review!.id, fsrs: before, lastReviewAt: card.last_review_at },
    backIn: untilLabel(next.due, now),
  };
}

export async function undoRating(undo: RatingUndo): Promise<void> {
  if (!UUID.test(undo.cardId) || !UUID.test(undo.reviewId)) throw new Error("Bad undo");
  const user = await requireUser();
  const supabase = await createClient();
  await supabase
    .from("cards")
    .update({ fsrs: undo.fsrs, last_review_at: undo.lastReviewAt })
    .eq("id", undo.cardId);
  await supabase.from("reviews").delete().eq("id", undo.reviewId);
  await bumpActivity(supabase, user.id, "cards_reviewed", -1);
  refresh();
}
