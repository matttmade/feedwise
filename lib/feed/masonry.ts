/**
 * The Board uses CSS columns, which fill top-to-bottom: the card at the top of column 2 is
 * somewhere in the middle of the list. These helpers estimate which cards start a column at
 * each breakpoint so they can load eagerly (they're above the fold, often the LCP image).
 */

export const MIN_RATIO = 0.66;
export const MAX_RATIO = 2.1;

export const clampRatio = (r: number) => Math.min(MAX_RATIO, Math.max(MIN_RATIO, r));

/** Text block height as a fraction of column width: narrow phone columns wrap more. */
const TEXT_FACTOR: Record<number, number> = { 2: 1.0, 3: 0.8, 4: 0.65, 5: 0.6 };

/** Indexes of the first card in each column after the first, for `n` balanced columns. */
export function columnStarts(ratios: number[], n: number): number[] {
  const text = TEXT_FACTOR[n] ?? 0.7;
  const heights = ratios.map((r) => 1 / clampRatio(r) + text);
  const total = heights.reduce((a, b) => a + b, 0);
  const starts: number[] = [];
  let before = 0;
  let k = 1;
  heights.forEach((h, i) => {
    // A card that would cross the k-th balance line starts column k+1 (break-inside: avoid).
    while (k < n && before + h > (k * total) / n + 1e-9) {
      if (i > 0 && !starts.includes(i)) starts.push(i);
      k++;
    }
    before += h;
  });
  return starts;
}

/**
 * Cards worth loading eagerly: the first two, plus the likely top of column 2 on phones (±1)
 * — roughly what a phone shows before scrolling.
 * Wider layouts rely on lazy loading — eagerly fetching every column top competes for
 * bandwidth on slow connections and delays the image that matters.
 */
export function eagerIndexes(ratios: number[]): Set<number> {
  const out = new Set<number>([0, 1].filter((i) => i < ratios.length));
  for (const s of columnStarts(ratios, 2)) {
    out.add(s);
    if (s + 1 < ratios.length) out.add(s + 1);
  }
  return out;
}
