import { createEmptyCard, fsrs, Rating, type Card, type CardInput, type Grade } from "ts-fsrs";

/** The three buttons on a review card, as stored in `reviews.rating`. */
export type ReviewRating = "again" | "hard" | "good";

export const RATING_LABELS: Record<ReviewRating, string> = {
  good: "Got it",
  hard: "Shaky",
  again: "Forgot",
};

const GRADE: Record<ReviewRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
};

/** FSRS state as it lives in `cards.fsrs` (dates as ISO strings). */
export type StoredFsrs = {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
};

/**
 * Long-term scheduling only: a card is seen at most once a day, so the daily cap means what it
 * says and nothing pops back up minutes later. "Forgot" brings a card back tomorrow.
 */
const scheduler = fsrs({ request_retention: 0.9, enable_short_term: false, enable_fuzz: true });
const exact = fsrs({ request_retention: 0.9, enable_short_term: false, enable_fuzz: false });

export function newCardState(now: Date): StoredFsrs {
  return toStored(createEmptyCard(now));
}

/** Apply a rating. `fuzz: false` makes intervals deterministic (tests). */
export function rate(
  state: StoredFsrs,
  rating: ReviewRating,
  now: Date,
  opts: { fuzz?: boolean } = {},
): StoredFsrs {
  const input: CardInput = { ...state, due: state.due, last_review: state.last_review };
  const { card } = (opts.fuzz === false ? exact : scheduler).next(input, now, GRADE[rating]);
  return toStored(card);
}

function toStored(card: Card): StoredFsrs {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? card.last_review.toISOString() : null,
  };
}

/** "tomorrow", "in 3 days", "in 2 weeks" — when a card will come back. */
export function untilLabel(due: string, now: Date): string {
  const days = Math.round((new Date(due).getTime() - now.getTime()) / 86_400_000);
  if (days <= 1) return "tomorrow";
  if (days < 14) return `in ${days} days`;
  if (days < 60) return `in ${Math.round(days / 7)} weeks`;
  return `in ${Math.round(days / 30)} months`;
}
