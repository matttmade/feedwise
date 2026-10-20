/**
 * Local exit-gate audit for Phase 1. Needs `pnpm db:start` and `pnpm build && pnpm start`.
 *
 *   pnpm audit:a11y            sign in via the local Mailpit inbox, run axe on every screen at
 *                              375 / 768 / 1280 px, save screenshots to audit-output/
 *   pnpm audit:a11y --seed     also add a few real sources first (needs network)
 *
 * Writes audit-output/axe.json and audit-output/session.json (cookies, for Lighthouse).
 */
import { mkdir, writeFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { chromium, type Page } from "playwright";

const BASE = process.env.AUDIT_BASE_URL ?? "http://localhost:3000";
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const EMAIL = process.env.AUDIT_EMAIL ?? "test@feedwise.local";
const OUT = "audit-output";
const WIDTHS = [375, 768, 1280];
const SEED = [
  "https://www.smashingmagazine.com/articles/",
  "https://www.figma.com/blog/",
  "https://motionographer.com/",
  "https://www.youtube.com/@joindiveclub",
  "https://www.itsnicethat.com/",
];

async function latestMagicLink(after: number): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/messages`)).json();
    const msg = list.messages?.find(
      (m: { Created: string; To: { Address: string }[] }) =>
        new Date(m.Created).getTime() >= after && m.To.some((t) => t.Address === EMAIL),
    );
    if (msg) {
      const full = await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json();
      const link = /href="([^"]+verify[^"]+)"/.exec(full.HTML)?.[1];
      if (link) return link.replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("No magic link arrived in Mailpit");
}

async function signIn(page: Page) {
  const sentAt = Date.now() - 1000;
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await page.getByText("Check your inbox.").waitFor();
  await page.goto(await latestMagicLink(sentAt));
  await page.waitForURL(`${BASE}/today`);
}

async function seed(page: Page) {
  for (const url of SEED) {
    await page.goto(`${BASE}/sources`);
    await page.getByLabel("Site or YouTube channel address").fill(url);
    await page.getByRole("button", { name: "Find feeds" }).click();
    const follow = page.getByRole("button", { name: "Follow this source" });
    const none = page.getByText(/couldn't|blocks automated/);
    await Promise.race([follow.waitFor({ timeout: 30_000 }), none.waitFor({ timeout: 30_000 })]);
    if (await follow.isVisible()) {
      await follow.click();
      await page
        .getByRole("status")
        .getByText(/Added|already follow/)
        .waitFor({ timeout: 60_000 })
        .catch(() => {});
    }
    console.error(`seeded ${url}`);
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium",
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page);
  if (process.argv.includes("--seed")) await seed(page);

  // Find a real item for the Reader.
  await page.goto(`${BASE}/explore`);
  const readerHref = await page
    .locator('main a[href^="/reader/"]:not([aria-hidden])')
    .first()
    .getAttribute("href")
    .catch(() => null);

  const routes = ["/today", "/explore", "/sources", "/help", ...(readerHref ? [readerHref] : [])];
  const results: Record<string, unknown>[] = [];
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width < 768 ? 812 : 900 });
    for (const route of routes) {
      await page.goto(`${BASE}${route}`);
      await page.waitForLoadState("networkidle");
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const scroll = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      const name = `${route.replace(/\//g, "_") || "_"}-${width}`;
      await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
      results.push({
        route,
        width,
        horizontalScroll: scroll,
        violations: axe.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.map((n) => n.target.join(" ")).slice(0, 5),
        })),
      });
      const critical = axe.violations.filter((v) => v.impact === "critical").length;
      console.error(
        `${String(width).padStart(4)} ${route.padEnd(48)} violations=${axe.violations.length} critical=${critical}${scroll ? " H-SCROLL" : ""}`,
      );
    }
  }
  await writeFile(`${OUT}/axe.json`, JSON.stringify(results, null, 2));
  await writeFile(`${OUT}/session.json`, JSON.stringify(await context.cookies(), null, 2));
  await browser.close();

  const critical = results.flatMap((r) =>
    (r.violations as { impact: string }[]).filter((v) => v.impact === "critical"),
  );
  console.error(`\nAxe critical issues: ${critical.length}`);
  process.exit(critical.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
