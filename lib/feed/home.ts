import { costMinutes } from "./select";

/** Just what the home needs to deal items into sections. */
export type HomeItem = {
  id: string;
  type: string;
  readMinutes: number | null;
  durationSeconds: number | null;
  sourceId: string;
  topicIds: string[];
};

export type HomeSections<T> = {
  /** A short stack to keep or skip right on the home. */
  sort: T[];
  quick: T[];
  videos: T[];
  long: T[];
  /** Newest item per source, in pool order. */
  bySource: T[];
  /** Up to six items per topic id, for the topic tabs (may repeat items from elsewhere). */
  byTopic: Record<string, T[]>;
};

export const SECTION_SIZES = { sort: 5, quick: 10, videos: 8, long: 6, bySource: 8, topic: 6 };

/**
 * Deal a pool of fresh items (newest first) into the home's sections. Items already shown
 * (today's set, Continue) are skipped, and no item appears in two of the main sections.
 * Topic tabs are a different view of the pool, so they may repeat.
 */
export function dealHome<T extends HomeItem>(pool: T[], shown: Set<string>): HomeSections<T> {
  const used = new Set(shown);
  const take = (n: number, ok: (i: T) => boolean) => {
    const out: T[] = [];
    for (const i of pool) {
      if (out.length >= n) break;
      if (used.has(i.id) || !ok(i)) continue;
      used.add(i.id);
      out.push(i);
    }
    return out;
  };
  const minutes = (i: T) => costMinutes(i);

  const videos = take(SECTION_SIZES.videos, (i) => i.type === "video");
  const long = take(SECTION_SIZES.long, (i) => i.type !== "video" && (minutes(i) ?? 0) >= 15);
  const quick = take(SECTION_SIZES.quick, (i) => i.type !== "video" && (minutes(i) ?? 99) < 5);
  const sort = take(SECTION_SIZES.sort, () => true);

  const seenSources = new Set<string>();
  const bySource = take(SECTION_SIZES.bySource, (i) => {
    if (seenSources.has(i.sourceId)) return false;
    seenSources.add(i.sourceId);
    return true;
  });

  const byTopic: Record<string, T[]> = {};
  for (const i of pool) {
    if (shown.has(i.id)) continue;
    for (const t of i.topicIds) {
      const list = (byTopic[t] ??= []);
      if (list.length < SECTION_SIZES.topic) list.push(i);
    }
  }
  return { sort, quick, videos, long, bySource, byTopic };
}

/** Today's resurfaced highlight: stable through the day, a different one tomorrow. */
export function pickOfTheDay<T>(list: T[], day: string): T | null {
  if (!list.length) return null;
  let h = 0;
  for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}
