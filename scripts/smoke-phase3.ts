/**
 * Phase 3 browser check against the LOCAL stack (pnpm db:start + pnpm build && pnpm start).
 * Settings dials, Board swipe + press-and-hold, the Swipe deck, Watch mode, and the lean
 * motion (on at full motion, off under reduced motion). Run `pnpm audit:a11y` first for a
 * signed-in session. Resets local settings to defaults at the end.
 *
 *   pnpm exec tsx scripts/smoke-phase3.ts
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { chromium, type Locator, type Page } from "playwright";

const DB = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sql = (q: string) =>
  execSync(`psql -qtA ${DB} -c "${q.replace(/"/g, '\\"')}"`)
    .toString()
    .trim();
const log = (...a: unknown[]) => console.log("•", ...a);
const BASE = "http://localhost:3000";
const cookies = JSON.parse(readFileSync("audit-output/session.json", "utf8"));

async function drag(p: Page, el: Locator, dx: number, dy = 0) {
  const box = (await el.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + Math.min(box.height / 2, 150);
  await p.mouse.move(x, y);
  await p.mouse.down();
  for (let i = 1; i <= 8; i++) await p.mouse.move(x + (dx * i) / 8, y + (dy * i) / 8);
  await p.mouse.up();
}

/** A touch press-and-hold, sent as pointer events (Playwright's touchscreen only taps). */
async function hold(el: Locator, ms = 700) {
  await el.evaluate(async (node, ms) => {
    const r = node.getBoundingClientRect();
    const init = {
      pointerId: 7,
      pointerType: "touch",
      isPrimary: true,
      bubbles: true,
      clientX: r.x + 40,
      clientY: r.y + 40,
    };
    node.dispatchEvent(new PointerEvent("pointerdown", init));
    await new Promise((res) => setTimeout(res, ms));
    node.dispatchEvent(new PointerEvent("pointerup", init));
  }, ms);
}

/** Wait for any view transition to end: the page is a snapshot (not tappable) meanwhile. */
const settle = (page: Page) =>
  page
    .waitForFunction(
      () =>
        !(document as Document & { activeViewTransition?: unknown }).activeViewTransition &&
        !document
          .getAnimations()
          .some(
            (a) =>
              a.playState === "running" &&
              String((a as CSSAnimation).animationName ?? "").includes("view-transition"),
          ),
      null,
      { timeout: 5000 },
    )
    .then(() => page.waitForTimeout(100));

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
await ctx.addCookies(cookies);
const p = await ctx.newPage();
sql("delete from settings");
// Local test data only: bring kept/skipped items back so the deck has a full set.
sql(
  "delete from highlights where text is null and image_url is null; delete from user_items where state in ('kept', 'skipped')",
);

// 1. Settings apply immediately and survive a reload (pre-paint cookie script).
await p.goto(`${BASE}/settings`);
if (p.url().includes("/login")) throw new Error("session expired — rerun pnpm audit:a11y");
await p.getByText("Extra large").click();
await p.getByText("Saved.").waitFor();
log("text size live:", await p.evaluate(() => document.documentElement.dataset.text));
await p.getByText("Compact").click();
await p.getByText("Saved.").waitFor();
await p.goto(`${BASE}/explore`);
log(
  "after reload: text",
  await p.evaluate(() => document.documentElement.dataset.text),
  "| board columns",
  await p.locator(".board").evaluate((el) => getComputedStyle(el).columnCount),
);
await p.goto(`${BASE}/settings`);
await p.getByLabel("Calm mode").check();
await p.getByText("Saved.").waitFor();
log(
  "calm:",
  await p.evaluate(() => "calm" in document.documentElement.dataset),
  "| motion dial disabled:",
  await p
    .locator("fieldset")
    .filter({ has: p.locator("legend", { hasText: /^Motion$/ }) })
    .evaluate((f) => (f as HTMLFieldSetElement).disabled),
  "| autoplay forced off:",
  !(await p.getByLabel("Autoplay videos in Watch").isChecked()),
);
await p.getByLabel("Calm mode").uncheck();
await p.getByText("Medium").click();
await p.getByText("Comfortable").click();
await p.getByText("Saved.").waitFor();

// 2. Board gestures: drag left hides, press-and-hold keeps; both undoable.
await p.goto(`${BASE}/explore`);
await p.waitForLoadState("networkidle");
await settle(p);
const first = p.locator(".board article").first();
const t1 = await first.locator("h3").innerText();
await drag(p, first, -260);
await p.getByRole("status").getByText("Skipped.").waitFor();
log("board swipe left → Skipped:", t1.slice(0, 40));
await p.getByRole("button", { name: "Undo" }).click();
await p.getByRole("status").getByText("Undone.").waitFor();
const second = p.locator(".board article").nth(1);
const t2 = await second.locator("h3").innerText();
await hold(second.locator("img").last());
await p.getByRole("status").getByText(/^Kept/).waitFor();
log("board press-and-hold → Kept:", t2.slice(0, 40));
await p.getByRole("button", { name: "Undo" }).click();
await p.getByRole("status").getByText("Undone.").waitFor();
const tap = p.locator(".board article").nth(2);
await drag(p, tap, 30);
log("short drag springs back, still on Explore:", p.url().endsWith("/explore"));

// 3. Lean: moves while scrolling at full motion, settles to 0 and stops.
await p.mouse.wheel(0, 900);
await p.waitForTimeout(80);
const during = await p
  .locator(".board")
  .evaluate((el) => Number(getComputedStyle(el).getPropertyValue("--lean") || 0));
await p.waitForTimeout(6000);
const after = await p
  .locator(".board")
  .evaluate((el) => Number(getComputedStyle(el).getPropertyValue("--lean") || 0));
log("lean while scrolling:", during.toFixed(3), "→ settled:", after);

// 4. Swipe deck: drag, keys, undo, buttons, summary.
await p.goto(`${BASE}/explore?mode=swipe`);
await p.waitForLoadState("networkidle");
await settle(p);
await p.getByText(/^01 \/ \d+/).waitFor();
const deckSize = Number((await p.getByText(/^01 \/ \d+/).innerText()).match(/\/ (\d+)/)![1]);
await drag(p, p.locator(".swipe-card"), 300);
await p.getByText(/^Kept “/).waitFor();
log("deck drag right → kept; now", await p.getByText(/^\d+ \/ \d+/).innerText());
await p.keyboard.press("ArrowLeft");
await p.getByText("Skipped.").waitFor();
await p.getByRole("button", { name: "Undo" }).click();
await p.getByText("Undone. It's back on top.").waitFor();
log("← skip then Undo →", await p.getByText(/^\d+ \/ \d+/).innerText());
await p.getByRole("button", { name: "Keep", exact: true }).click();
for (let i = 0; i < deckSize - 2; i++) {
  await p.waitForTimeout(60);
  await p.keyboard.press(i % 2 ? "x" : "ArrowLeft");
}
await p.getByRole("heading", { name: `That's ${deckSize}.` }).waitFor();
log(
  "deck summary:",
  (await p.locator("main section").last().innerText()).replace(/\s+/g, " ").slice(0, 120),
);

// 5. Watch: poster first, muted player on Play, autoplay only when switched on.
// The deck above may have skipped the local videos; bring them back first.
sql("delete from user_items where state in ('kept', 'skipped')");
await p.goto(`${BASE}/explore?mode=watch`);
await p.waitForLoadState("networkidle");
await settle(p);
const slides = await p.locator(".watch-slide[data-id]").count();
log(
  "watch slides:",
  slides,
  "| iframes before play:",
  await p.locator(".watch-stream iframe").count(),
);
await p
  .getByRole("button", { name: /^Play / })
  .first()
  .click();
const src = await p.locator(".watch-stream iframe").first().getAttribute("src");
log("player after Play:", src?.replace(/^https:\/\/([^/]+).*?(mute=1|muted=1).*$/, "$1 … $2"));
await p.goto(`${BASE}/settings`);
await p.getByLabel("Autoplay videos in Watch").check();
await p.getByText("Saved.").waitFor();
await p.goto(`${BASE}/explore?mode=watch`);
await p.waitForTimeout(1200);
log("autoplay on → iframes without a click:", await p.locator(".watch-stream iframe").count());
await p.screenshot({ path: "audit-output/p3-watch-390.png" });

// 6. Reduced motion (OS): no lean.
const rctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
await rctx.addCookies(cookies);
const r = await rctx.newPage();
await r.goto(`${BASE}/explore`);
await r.waitForLoadState("networkidle");
await r.mouse.wheel(0, 900);
await r.waitForTimeout(80);
log(
  "reduced motion lean while scrolling:",
  await r
    .locator(".board")
    .evaluate((el) => getComputedStyle(el).getPropertyValue("--lean") || "0"),
);

await p.goto(`${BASE}/explore?mode=swipe`);
await p.waitForLoadState("networkidle");
await settle(p);
await p.screenshot({ path: "audit-output/p3-swipe-390.png" });
await p.goto(`${BASE}/settings`);
await p.screenshot({ path: "audit-output/p3-settings-390.png", fullPage: true });
sql("delete from settings");
await b.close();
