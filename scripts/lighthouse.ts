/**
 * Lighthouse (mobile, default throttling) on each signed-in screen.
 * Run `pnpm audit:a11y` first: it saves the session cookies this script reuses.
 *
 *   pnpm audit:lighthouse          (LH_RUNS=3 by default; the median run by performance is kept)
 */
import { readFile, writeFile } from "node:fs/promises";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";

const BASE = process.env.AUDIT_BASE_URL ?? "http://localhost:3000";
const OUT = "audit-output";

async function main() {
  const cookies: { name: string; value: string }[] = JSON.parse(
    await readFile(`${OUT}/session.json`, "utf8"),
  );
  const axe = JSON.parse(await readFile(`${OUT}/axe.json`, "utf8")) as { route: string }[];
  const routes = [...new Set(["/login", ...axe.map((r) => r.route)])];
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

  const chrome = await chromeLauncher.launch({
    chromePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium",
    chromeFlags: ["--headless=new", "--no-sandbox"],
  });
  const rows: {
    route: string;
    performance: number;
    accessibility: number;
    bestPractices: number;
    lcp: string;
    cls: string;
    tbt: string;
  }[] = [];
  try {
    for (const route of routes) {
      // Scores swing a few points run to run; keep the median, as Lighthouse's docs recommend.
      const runs = [];
      for (let i = 0; i < Number(process.env.LH_RUNS ?? 3); i++) {
        const r = await lighthouse(`${BASE}${route}`, {
          port: chrome.port,
          output: "html",
          logLevel: "error",
          onlyCategories: ["performance", "accessibility", "best-practices"],
          extraHeaders: route === "/login" ? {} : { cookie: cookieHeader },
        });
        if (r) runs.push(r);
      }
      runs.sort(
        (a, b) =>
          (a.lhr.categories.performance.score ?? 0) - (b.lhr.categories.performance.score ?? 0),
      );
      const result = runs[Math.floor(runs.length / 2)];
      if (!result) continue;
      const { categories, audits } = result.lhr;
      const score = (k: string) => Math.round((categories[k]?.score ?? 0) * 100);
      rows.push({
        route,
        performance: score("performance"),
        accessibility: score("accessibility"),
        bestPractices: score("best-practices"),
        lcp: audits["largest-contentful-paint"]?.displayValue ?? "",
        cls: audits["cumulative-layout-shift"]?.displayValue ?? "",
        tbt: audits["total-blocking-time"]?.displayValue ?? "",
      });
      const name = route.replace(/\//g, "_") || "_";
      await writeFile(`${OUT}/lighthouse${name}.html`, result.report as string);
      console.error(rows.at(-1));
    }
  } finally {
    chrome.kill();
  }
  await writeFile(`${OUT}/lighthouse.json`, JSON.stringify(rows, null, 2));
  const failing = rows.filter((r) => r.performance < 90 || r.accessibility < 90);
  console.error(
    failing.length
      ? `\nBelow 90: ${failing.map((r) => r.route).join(", ")}`
      : "\nAll screens ≥ 90.",
  );
  process.exit(failing.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
