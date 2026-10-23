import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/auth";
import { startOfDay } from "@/lib/feed/select";
import { itemImageSet, proxiedImage } from "@/lib/images";
import { rate, untilLabel, type ReviewRating, type StoredFsrs } from "@/lib/srs/fsrs";
import { buildQueue } from "@/lib/srs/queue";
import { timeZone } from "@/lib/srs/cards";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "./feed";

export type ReviewCard = {
  id: string;
  prompt: string;
  answer: string;
  kind: "image" | "text";
  /** The saved image (image highlights) or the item's lead image as a cue. */
  image: string | null;
  itemId: string;
  itemTitle: string;
  sourceTitle: string;
  /** When each answer would bring the card back, shown under the buttons. */
  next: Record<ReviewRating, string>;
};

export type ReviewData = {
  cards: ReviewCard[];
  dueTotal: number;
  cap: number;
  reviewedToday: number;
  /** When the next card comes back, if nothing is due now. */
  nextDue: string | null;
  hasCards: boolean;
};

/** Today's capped queue. Cached per request so the nav badge and the page share one query. */
export const getReview = cache(async (): Promise<ReviewData> => {
  const user = await requireUser();
  const supabase = await createClient();
  const now = new Date();
  const dayStart = startOfDay(now, timeZone()).toISOString();

  const [settings, cardsRes, todayRes] = await Promise.all([
    getSettings(),
    supabase
      .from("cards")
      .select(
        "id, prompt, answer, fsrs, highlights(image_url, items(id, title, lead_image_url, sources(title)))",
      )
      .eq("user_id", user.id)
      .limit(1000),
    supabase
      .from("reviews")
      .select("card_id, cards!inner(user_id)")
      .eq("cards.user_id", user.id)
      .gte("reviewed_at", dayStart),
  ]);

  const all = (cardsRes.data ?? []).map((c) => ({ ...c, due: (c.fsrs as StoredFsrs).due }));
  const reviewedToday = new Set((todayRes.data ?? []).map((r) => r.card_id)).size;
  const { queue, dueTotal } = buildQueue(all, { now, cap: settings.reviewCap, reviewedToday });
  const upcoming = all
    .filter((c) => new Date(c.due) > now)
    .sort((a, b) => a.due.localeCompare(b.due))[0];

  return {
    cards: queue.map((c) => {
      const h = c.highlights;
      const item = h?.items;
      const fsrs = c.fsrs as StoredFsrs;
      return {
        id: c.id,
        prompt: c.prompt,
        answer: c.answer,
        kind: h?.image_url ? "image" : "text",
        image: h?.image_url
          ? proxiedImage(h.image_url, 640)
          : item?.lead_image_url
            ? itemImageSet(item.id, [480]).src
            : null,
        itemId: item?.id ?? "",
        itemTitle: item?.title ?? "",
        sourceTitle: item?.sources?.title ?? "",
        next: {
          again: untilLabel(rate(fsrs, "again", now, { fuzz: false }).due, now),
          hard: untilLabel(rate(fsrs, "hard", now, { fuzz: false }).due, now),
          good: untilLabel(rate(fsrs, "good", now, { fuzz: false }).due, now),
        },
      };
    }),
    dueTotal,
    cap: settings.reviewCap,
    reviewedToday,
    nextDue: upcoming ? untilLabel(upcoming.due, now) : null,
    hasCards: all.length > 0,
  };
});
