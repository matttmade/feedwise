/** Pure selection rules for Today and Explore. Kept free of I/O so they're easy to test. */

export const BATCH_MIN = 3;
export const BATCH_MAX = 5;
/** Older unread items quietly age out instead of piling up into a guilt backlog. */
export const FRESH_DAYS = 14;
export const BOARD_LIMIT = 16;
export const READ_THRESHOLD = 0.9;

export type Selectable = { id: string; sourceId: string; sortAt: string };

/** Today's goal clamped to the 3–5 range the brief allows. */
export function batchGoal(dailyGoal: number | null | undefined): number {
  return Math.min(BATCH_MAX, Math.max(BATCH_MIN, Math.round(dailyGoal ?? BATCH_MAX)));
}

/**
 * Newest first, but one source can't fill the whole batch: take the newest item from each
 * source in turn (round-robin), ordering sources by their newest item.
 */
export function pickBatch<T extends Selectable>(items: T[], n: number): T[] {
  if (n <= 0) return [];
  const bySource = new Map<string, T[]>();
  for (const item of [...items].sort((a, b) => b.sortAt.localeCompare(a.sortAt))) {
    const list = bySource.get(item.sourceId) ?? [];
    list.push(item);
    bySource.set(item.sourceId, list);
  }
  const queues = [...bySource.values()];
  const out: T[] = [];
  while (out.length < n && queues.some((q) => q.length)) {
    for (const q of queues) {
      const next = q.shift();
      if (next) out.push(next);
      if (out.length === n) break;
    }
  }
  return out;
}

export const TIME_CHIPS = [
  { id: "any", label: "Any length" },
  { id: "quick", label: "Under 5 min" },
  { id: "medium", label: "5–15 min" },
  { id: "long", label: "15+ min" },
  { id: "video", label: "Videos" },
] as const;
export type TimeChip = (typeof TIME_CHIPS)[number]["id"];

export function parseTimeChip(value: unknown): TimeChip {
  return TIME_CHIPS.some((c) => c.id === value) ? (value as TimeChip) : "any";
}

export type Costed = { type: string; readMinutes: number | null; durationSeconds: number | null };

/** Minutes this item will take, from read time or video length. Null when unknown. */
export function costMinutes(item: Costed): number | null {
  if (item.durationSeconds) return Math.max(1, Math.round(item.durationSeconds / 60));
  return item.readMinutes;
}

export function matchesTime(item: Costed, chip: TimeChip): boolean {
  const m = costMinutes(item);
  switch (chip) {
    case "any":
      return true;
    case "video":
      return item.type === "video";
    case "quick":
      return m !== null && m < 5;
    case "medium":
      return m !== null && m >= 5 && m <= 15;
    case "long":
      return m !== null && m > 15;
  }
}

/** "4 min read", "2:31", "Video" — the cost label every card shows. */
export function costLabel(item: Costed): string | null {
  if (item.durationSeconds) {
    const total = Math.round(item.durationSeconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = String(total % 60).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
  }
  if (item.type === "video") return "Video";
  if (item.readMinutes) return `${item.readMinutes} min read`;
  return null;
}

/** Start of "today" in the given IANA time zone, as a UTC instant. */
export function startOfDay(now: Date, timeZone: string): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const wallNow = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    +parts.hour,
    +parts.minute,
    +parts.second,
  );
  const offset = wallNow - Math.floor(now.getTime() / 1000) * 1000;
  return new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day) - offset);
}
