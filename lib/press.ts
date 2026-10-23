/**
 * "Press" edition: a vintage-newspaper treatment layered over the normal design (newsprint
 * ground, halftone images, register marks, plates that drift out of register while you
 * scroll). A per-browser preference kept in a cookie and applied before first paint.
 */
export const PRESS_COOKIE = "fw_press";

export const PRESS_SCRIPT = `(function(){try{if(/(?:^|; )${PRESS_COOKIE}=1/.test(document.cookie))document.documentElement.dataset.press="";}catch(e){}})();`;

export function setPress(on: boolean) {
  const h = document.documentElement;
  if (on) h.dataset.press = "";
  else delete h.dataset.press;
  document.cookie = `${PRESS_COOKIE}=${on ? 1 : 0}; path=/; max-age=31536000; samesite=lax`;
}

export const pressOn = () => "press" in document.documentElement.dataset;

/** Issue line for the masthead: volume from the year, number from the day of the year. */
export function issueLine(now: Date): string {
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start) / 86_400_000);
  return `Vol. ${now.getUTCFullYear() - 2025} · No. ${day}`;
}
