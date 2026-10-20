/** "Make it mine" preferences: shared by the server, the settings form and the pre-paint script. */

export const DENSITIES = ["compact", "comfortable", "spacious"] as const;
export const MOTIONS = ["off", "reduced", "full"] as const;
export const TEXT_SIZES = ["sm", "md", "lg", "xl"] as const;
export const DAILY_GOALS = [3, 4, 5] as const;
export const REVIEW_CAPS = [5, 10, 15, 20] as const;

export type Density = (typeof DENSITIES)[number];
export type Motion = (typeof MOTIONS)[number];
export type TextSize = (typeof TEXT_SIZES)[number];

export type Prefs = {
  density: Density;
  motion: Motion;
  autoplay: boolean;
  captions: boolean;
  textSize: TextSize;
  dailyGoal: number;
  reviewCap: number;
  calmMode: boolean;
};

/** Motion on (the OS "reduce motion" setting still wins), autoplay off, captions on. */
export const DEFAULT_PREFS: Prefs = {
  density: "comfortable",
  motion: "full",
  autoplay: false,
  captions: true,
  textSize: "md",
  dailyGoal: 5,
  reviewCap: 10,
  calmMode: false,
};

const pick = <T extends readonly (string | number)[]>(
  list: T,
  v: unknown,
  fallback: T[number],
): T[number] => ((list as readonly unknown[]).includes(v) ? (v as T[number]) : fallback);

/** Validate anything (form data, a cookie, a DB row mapped to this shape) into Prefs. */
export function normalisePrefs(raw: Partial<Record<keyof Prefs, unknown>>): Prefs {
  const d = DEFAULT_PREFS;
  const num = (v: unknown) => (typeof v === "string" ? Number(v) : v);
  const bool = (v: unknown, f: boolean) =>
    v === undefined ? f : v === true || v === "on" || v === "true";
  return {
    density: pick(DENSITIES, raw.density, d.density),
    motion: pick(MOTIONS, raw.motion, d.motion),
    autoplay: bool(raw.autoplay, d.autoplay),
    captions: bool(raw.captions, d.captions),
    textSize: pick(TEXT_SIZES, raw.textSize, d.textSize),
    // The form offers presets, but any sensible stored number is honoured.
    dailyGoal: whole(num(raw.dailyGoal), 3, 5, d.dailyGoal),
    reviewCap: whole(num(raw.reviewCap), 1, 50, d.reviewCap),
    calmMode: bool(raw.calmMode, d.calmMode),
  };
}

function whole(v: unknown, min: number, max: number, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v)
    ? Math.min(max, Math.max(min, Math.round(v)))
    : fallback;
}

/** Calm mode overrides: no non-essential motion, no autoplay. */
export function effectivePrefs(p: Prefs): Prefs {
  return p.calmMode ? { ...p, motion: "off", autoplay: false } : p;
}

export const PREFS_COOKIE = "fw_prefs";

/** The few values the page needs before paint, kept short for the cookie. */
export function prefsCookieValue(p: Prefs): string {
  const e = effectivePrefs(p);
  return JSON.stringify({
    m: e.motion,
    d: e.density,
    t: e.textSize,
    c: p.calmMode ? 1 : 0,
    a: e.autoplay ? 1 : 0,
    cc: p.captions ? 1 : 0,
  });
}

/** Sets data-* attributes on <html> from the cookie before first paint (no flash of wrong size). */
export const PREFS_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${PREFS_COOKIE}=([^;]*)/);if(!m)return;var p=JSON.parse(decodeURIComponent(m[1]));var h=document.documentElement;h.dataset.motion=p.m;h.dataset.density=p.d;h.dataset.text=p.t;h.dataset.autoplay=p.a?"on":"off";h.dataset.captions=p.cc?"on":"off";if(p.c)h.dataset.calm="";else delete h.dataset.calm;}catch(e){}})();`;

/** Same as the script, for applying a just-saved change without a reload. */
export function applyPrefsToDocument(p: Prefs) {
  const e = effectivePrefs(p);
  const h = document.documentElement;
  h.dataset.motion = e.motion;
  h.dataset.density = e.density;
  h.dataset.text = e.textSize;
  h.dataset.autoplay = e.autoplay ? "on" : "off";
  h.dataset.captions = p.captions ? "on" : "off";
  if (p.calmMode) h.dataset.calm = "";
  else delete h.dataset.calm;
}
