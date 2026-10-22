/**
 * "For you" ranking: what you're reading and into floats up, fresh posts get a head start,
 * and a little seeded variety reshuffles the order every few minutes so the home keeps
 * changing. Pure and unit-tested; the server supplies the signals.
 */

export type Signal = {
  sourceId: string;
  topicIds: string[];
  /** Opened at all. */
  opened: boolean;
  /** How far you read (0–1). */
  progress: number;
  kept: boolean;
  skipped: boolean;
};

export type Affinity = { sources: Map<string, number>; topics: Map<string, number> };

/** Weight of one past interaction: reading and keeping count for, skipping against. */
export function signalWeight(s: Signal): number {
  let w = 0;
  if (s.opened) w += 1;
  if (s.progress >= 0.5) w += 1;
  if (s.kept) w += 2;
  if (s.skipped) w -= 1;
  return w;
}

/** Sum interaction weights per source and topic, squashed into −1…1. */
export function affinity(signals: Signal[]): Affinity {
  const sources = new Map<string, number>();
  const topics = new Map<string, number>();
  for (const s of signals) {
    const w = signalWeight(s);
    if (!w) continue;
    sources.set(s.sourceId, (sources.get(s.sourceId) ?? 0) + w);
    for (const t of s.topicIds) topics.set(t, (topics.get(t) ?? 0) + w);
  }
  const squash = (m: Map<string, number>) => {
    for (const [k, v] of m) m.set(k, Math.tanh(v / 4));
    return m;
  };
  return { sources: squash(sources), topics: squash(topics) };
}

/** Deterministic 0–1 noise from a string (same item + same seed = same value). */
export function noise(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export type Rankable = { id: string; sourceId: string; topicIds: string[]; sortAt: string };

export const WEIGHTS = { fresh: 1, source: 0.9, topic: 0.6, variety: 0.45, freshDays: 4 };

export function score(item: Rankable, a: Affinity, now: number, seed: string): number {
  const ageDays = Math.max(0, (now - new Date(item.sortAt).getTime()) / 86_400_000);
  const fresh = Math.exp(-ageDays / WEIGHTS.freshDays);
  const src = a.sources.get(item.sourceId) ?? 0;
  const topicVals = item.topicIds.map((t) => a.topics.get(t) ?? 0);
  const topic = topicVals.length ? topicVals.reduce((x, y) => x + y, 0) / topicVals.length : 0;
  return (
    WEIGHTS.fresh * fresh +
    WEIGHTS.source * src +
    WEIGHTS.topic * topic +
    WEIGHTS.variety * noise(`${item.id}:${seed}`)
  );
}

/** Highest score first. Stable for a given seed, different when the seed moves on. */
export function rank<T extends Rankable>(items: T[], a: Affinity, now: number, seed: string): T[] {
  return items
    .map((item) => ({ item, s: score(item, a, now, seed) }))
    .sort((x, y) => y.s - x.s)
    .map((x) => x.item);
}

/** The variety seed changes every `minutes`, plus whatever the "Shuffle" link adds. */
export const varietySeed = (now: number, minutes = 10, mix = "") =>
  `${Math.floor(now / (minutes * 60_000))}${mix}`;
