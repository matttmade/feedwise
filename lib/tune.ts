/**
 * Tune: live layout and effect dials. Each dial is a CSS variable or a data attribute on
 * <html>, so the panel, the pre-paint script and the stylesheet share one source. JS
 * effects (WebGL, depth, Press drift) read the current values with `tuneValue`.
 * Values are a per-browser convenience in localStorage; DEFAULT_TUNE is the shipped look.
 */

export type Dial = {
  key: string;
  label: string;
  group: (typeof TUNE_GROUPS)[number];
  /** Shown next to the value, e.g. "px" or "×". */
  unit?: string;
} & (
  | { kind: "range"; min: number; max: number; step: number; value: number; cssVar?: string }
  | { kind: "select"; options: string[]; value: string; attr: string }
);

export const TUNE_GROUPS = ["Type", "Layout", "Images", "Motion", "Press"] as const;

export const DIALS: Dial[] = [
  // Type
  {
    key: "display",
    label: "Display size",
    group: "Type",
    kind: "range",
    min: 0.5,
    max: 1.3,
    step: 0.05,
    value: 1,
    unit: "×",
    cssVar: "--k-display",
  },
  {
    key: "headline",
    label: "Headline size",
    group: "Type",
    kind: "range",
    min: 0.6,
    max: 1.4,
    step: 0.05,
    value: 1,
    unit: "×",
    cssVar: "--k-headline",
  },
  {
    key: "weight",
    label: "Display weight",
    group: "Type",
    kind: "range",
    min: 200,
    max: 600,
    step: 100,
    value: 300,
    cssVar: "--w-display",
  },
  {
    key: "tracking",
    label: "Label tracking",
    group: "Type",
    kind: "range",
    min: 0.05,
    max: 0.35,
    step: 0.01,
    value: 0.2,
    unit: "em",
    cssVar: "--k-tracking",
  },
  // Layout
  {
    key: "gutter",
    label: "Page margin",
    group: "Layout",
    kind: "range",
    min: 8,
    max: 96,
    step: 4,
    value: 32,
    unit: "px",
    cssVar: "--k-gutter",
  },
  {
    key: "sections",
    label: "Section spacing",
    group: "Layout",
    kind: "range",
    min: 0.4,
    max: 1.6,
    step: 0.1,
    value: 1,
    unit: "×",
    cssVar: "--k-sections",
  },
  {
    key: "gap",
    label: "Gap between stories",
    group: "Layout",
    kind: "range",
    min: 0.25,
    max: 1.5,
    step: 0.05,
    value: 1,
    unit: "×",
    cssVar: "--k-gap",
  },
  {
    key: "stagger",
    label: "Stagger",
    group: "Layout",
    kind: "range",
    min: 0,
    max: 1.5,
    step: 0.1,
    value: 1,
    unit: "×",
    cssVar: "--k-stagger",
  },
  {
    key: "grid",
    label: "For you layout",
    group: "Layout",
    kind: "select",
    options: ["editorial", "even", "list"],
    value: "editorial",
    attr: "data-grid",
  },
  {
    key: "summaries",
    label: "Summaries",
    group: "Layout",
    kind: "select",
    options: ["some", "all", "none"],
    value: "some",
    attr: "data-summaries",
  },
  // Images
  {
    key: "colour",
    label: "Colour at rest",
    group: "Images",
    kind: "range",
    min: 0,
    max: 1,
    step: 0.05,
    value: 0,
  },
  {
    key: "ratio",
    label: "Image shape",
    group: "Images",
    kind: "select",
    options: ["native", "landscape", "square", "portrait"],
    value: "native",
    attr: "data-ratio",
  },
  {
    key: "bend",
    label: "Scroll bend",
    group: "Images",
    kind: "range",
    min: 0,
    max: 80,
    step: 2,
    value: 26,
    unit: "px",
  },
  // Motion
  {
    key: "depth",
    label: "Depth (parallax and lag)",
    group: "Motion",
    kind: "range",
    min: 0,
    max: 2,
    step: 0.1,
    value: 1,
    unit: "×",
  },
  {
    key: "fly",
    label: "Fly-in distance",
    group: "Motion",
    kind: "range",
    min: 0,
    max: 40,
    step: 1,
    value: 22,
    unit: "vh",
    cssVar: "--k-fly",
  },
  {
    key: "speed",
    label: "Transition length",
    group: "Motion",
    kind: "range",
    min: 0.5,
    max: 2,
    step: 0.1,
    value: 1,
    unit: "×",
    cssVar: "--k-dur",
  },
  {
    key: "smooth",
    label: "Smooth scroll (Today)",
    group: "Motion",
    kind: "select",
    options: ["on", "off"],
    value: "on",
    attr: "data-smooth",
  },
  {
    key: "glide",
    label: "Scroll glide",
    group: "Motion",
    kind: "range",
    min: 0.04,
    max: 0.3,
    step: 0.01,
    value: 0.1,
  },
  // Press
  {
    key: "halftone",
    label: "Halftone",
    group: "Press",
    kind: "range",
    min: 0,
    max: 1,
    step: 0.05,
    value: 0.45,
  },
  {
    key: "dot",
    label: "Dot size",
    group: "Press",
    kind: "range",
    min: 2,
    max: 8,
    step: 0.5,
    value: 3,
    unit: "px",
  },
  {
    key: "misprint",
    label: "Misprint drift",
    group: "Press",
    kind: "range",
    min: 0,
    max: 6,
    step: 0.2,
    value: 2.2,
    unit: "px",
  },
  {
    key: "grain",
    label: "Paper grain",
    group: "Press",
    kind: "range",
    min: 0,
    max: 0.2,
    step: 0.01,
    value: 0.07,
    cssVar: "--k-grain",
  },
  {
    key: "marks",
    label: "Register marks",
    group: "Press",
    kind: "range",
    min: 0,
    max: 1,
    step: 0.05,
    value: 0.42,
    cssVar: "--k-marks",
  },
];

export type TuneValues = Record<string, number | string>;

export const DEFAULT_TUNE: TuneValues = Object.fromEntries(DIALS.map((d) => [d.key, d.value]));

export const TUNE_KEY = "fw_tune";
export const TUNE_EVENT = "fw-tune";

/** Keep only known dials, with numbers clamped to range and options from the list. */
export function normaliseTune(raw: unknown): TuneValues {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: TuneValues = {};
  for (const d of DIALS) {
    const v = src[d.key];
    if (d.kind === "range") {
      const n = typeof v === "string" ? Number(v) : v;
      out[d.key] =
        typeof n === "number" && Number.isFinite(n) ? Math.min(d.max, Math.max(d.min, n)) : d.value;
    } else {
      out[d.key] = typeof v === "string" && d.options.includes(v) ? v : d.value;
    }
  }
  return out;
}

/** Only the dials that differ from the defaults: what's stored and what "Copy" hands over. */
export function changedTune(values: TuneValues): TuneValues {
  return Object.fromEntries(Object.entries(values).filter(([k, v]) => DEFAULT_TUNE[k] !== v));
}

/** CSS variables and data attributes for these values, applied to <html>. */
export function applyTune(root: HTMLElement, values: TuneValues): void {
  for (const d of DIALS) {
    const v = values[d.key] ?? d.value;
    if (d.kind === "range" && d.cssVar) root.style.setProperty(d.cssVar, String(v));
    if (d.kind === "select") {
      if (v === d.value) root.removeAttribute(d.attr);
      else root.setAttribute(d.attr, String(v));
    }
  }
}

let current: TuneValues | null = null;

export function readStoredTune(): TuneValues {
  if (typeof window === "undefined") return DEFAULT_TUNE;
  try {
    return normaliseTune(JSON.parse(localStorage.getItem(TUNE_KEY) ?? "{}"));
  } catch {
    return DEFAULT_TUNE;
  }
}

/** Current value of one dial, for effects running in JS. */
export function tuneValue(key: string): number {
  current ??= readStoredTune();
  const v = current[key] ?? DEFAULT_TUNE[key];
  return typeof v === "number" ? v : Number(v) || 0;
}

/** Load the stored values once on the client (the pre-paint script has already set the CSS). */
export function initTune(): TuneValues {
  current = readStoredTune();
  return current;
}

export function setTune(values: TuneValues): void {
  current = normaliseTune(values);
  applyTune(document.documentElement, current);
  try {
    localStorage.setItem(TUNE_KEY, JSON.stringify(changedTune(current)));
  } catch {}
  window.dispatchEvent(new Event(TUNE_EVENT));
}

/** Sets the stored dials on <html> before first paint, so there's no flash of the defaults. */
export const TUNE_SCRIPT = `(function(){try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(TUNE_KEY)})||"{}"),r=document.documentElement,d=${JSON.stringify(
  DIALS.map((d) => [
    d.key,
    d.kind === "range" ? (d.cssVar ?? "") : "",
    d.kind === "select" ? d.attr : "",
  ]),
)};d.forEach(function(x){var v=t[x[0]];if(v==null)return;if(x[1])r.style.setProperty(x[1],String(v));if(x[2])r.setAttribute(x[2],String(v));});}catch(e){}})();`;
