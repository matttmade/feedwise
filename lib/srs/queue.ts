/** Today's review queue: due cards, oldest first, never more than the daily cap. */

export type Queueable = { id: string; due: string };

export type Queue<T> = {
  queue: T[];
  /** Everything due right now, before the cap. */
  dueTotal: number;
  /** Cards still allowed today. */
  remaining: number;
};

export function buildQueue<T extends Queueable>(
  cards: T[],
  opts: { now: Date; cap: number; reviewedToday: number },
): Queue<T> {
  const now = opts.now.getTime();
  const remaining = Math.max(0, opts.cap - opts.reviewedToday);
  const due = cards
    .filter((c) => new Date(c.due).getTime() <= now)
    .sort((a, b) => a.due.localeCompare(b.due) || a.id.localeCompare(b.id));
  return { queue: due.slice(0, remaining), dueTotal: due.length, remaining };
}

/** Minutes a session will take, at roughly 20 seconds a card. */
export const sessionMinutes = (cards: number) => Math.max(1, Math.round((cards * 20) / 60));
