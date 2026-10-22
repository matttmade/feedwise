/**
 * Phase 2 browser check against the LOCAL stack (pnpm db:start + pnpm build && pnpm start).
 * It resets local highlights, cards and activity, then walks the learn loop: keep → card,
 * highlight + note + image, time-travel cards to due, review with undo, the daily cap, and
 * Library search / remove / undo. Run `pnpm audit:a11y` first for a signed-in session.
 *
 *   pnpm exec tsx scripts/smoke-phase2.ts
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { chromium, type Page } from "playwright";

const DB = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sql = (q: string) =>
  execSync(`psql -qtA ${DB} -c "${q.replace(/"/g, '\\"')}"`)
    .toString()
    .trim();
const log = (...a: unknown[]) => console.log("•", ...a);
const BASE = "http://localhost:3000";

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addCookies(JSON.parse(readFileSync("audit-output/session.json", "utf8")));
const p: Page = await ctx.newPage();

// Fresh start (local test data only).
sql(
  "delete from highlights; delete from activity; update user_items set state = 'new', kept_at = null where state = 'kept'",
);

// 1. Keep from Explore → a card exists
await p.goto(`${BASE}/explore`);
if (p.url().includes("/login")) throw new Error("session expired — rerun pnpm audit:a11y");
const card = p.locator("main article").first();
const keptTitle = await card.locator("h3").innerText();
await card.getByRole("button", { name: "Keep" }).click();
await p.getByRole("status").getByText("Kept").waitFor();
log("kept:", keptTitle.slice(0, 50), "| cards now:", sql("select count(*) from cards"));

// 2. Reader: select a passage and highlight it, add a note, save an image
const href = `/reader/${sql("select id from items where type = 'article' and length(body_html) > 3000 and body_html like '%<img%' order by created_at desc limit 1")}`;
await p.goto(`${BASE}${href}`);
await p.waitForLoadState("networkidle");
const para = p
  .locator("#reader-body .prose-reader p")
  .filter({ hasText: /\w+ \w+ \w+ \w+ \w+ \w+ \w+ \w+/ })
  .first();
await para.evaluate((el) => {
  const r = document.createRange();
  r.selectNodeContents(el);
  const s = window.getSelection()!;
  s.removeAllRanges();
  s.addRange(r);
});
await p.getByRole("button", { name: "Highlight this" }).click();
await p.getByRole("status").getByText("Highlighted.").waitFor();
await p.getByRole("heading", { name: /Your highlights/ }).waitFor();
log(
  "highlight saved; list shows:",
  await p.getByRole("heading", { name: /Your highlights/ }).innerText(),
);
await p.getByRole("button", { name: "Add a note" }).first().click();
await p.getByLabel("Your note").fill("The point is to design for judgement.");
await p.getByRole("button", { name: "Save note" }).click();
await p.getByText("The point is to design for judgement.").waitFor();
log("note saved");
const saveImage = p.getByRole("button", { name: "Save this image" }).first();
if (await saveImage.count()) {
  await saveImage.click();
  await p.getByRole("status").getByText("Image saved.").waitFor();
  log("image saved");
} else log("no body images on this item");
log(
  "cards now:",
  sql("select count(*) from cards"),
  "| card prompts:\n   ",
  sql(
    "select kind_hint from (select left(replace(prompt, E'\\n', ' '), 90) as kind_hint from cards order by id) t",
  )
    .split("\n")
    .join("\n    "),
);

// 3. Nothing due yet (new cards come back tomorrow)
await p.goto(`${BASE}/review`);
log("review before due:", (await p.locator("main h2").first().innerText()).trim());

// 4. Time travel: make everything due, check badge + Today hero
sql("update cards set fsrs = jsonb_set(fsrs, '{due}', to_jsonb('2026-10-01T00:00:00.000Z'::text))");
await p.goto(`${BASE}/today`);
await p.locator("#recall").waitFor();
log("Today recall:", (await p.locator("#recall").locator("..").innerText()).replace(/\s+/g, " "));
log(
  "nav badge:",
  (await p.locator('nav a[href="/review"]').last().innerText()).replace(/\s+/g, " "),
);

// 5. Review session: reveal, rate, undo, finish
await p.goto(`${BASE}/review`);
await p.waitForLoadState("networkidle");
const pad = (n: number) => String(n).padStart(2, "0");
const total = Number((await p.getByText(/Card 01 \/ \d+/).innerText()).match(/\/ (\d+)/)![1]);
log("session cards:", total);
await p.keyboard.press(" ");
await p.getByText("Answer", { exact: true }).waitFor();
await p.keyboard.press("3");
await p.getByText(/Nice\. Back/).waitFor();
log("rated Got it →", await p.getByText(/Nice\. Back/).innerText());
await p.getByRole("button", { name: "Undo" }).click();
await p.getByText(`Card 01 / ${pad(total)}`).waitFor();
log("undo returned to card 1; reviews rows:", sql("select count(*) from reviews"));
for (let i = 0; i < total; i++) {
  const show = p.getByRole("button", { name: "Show answer" });
  if (await show.isVisible()) await show.click();
  await p.getByRole("button", { name: i % 2 ? /Forgot/ : /Got it/ }).click();
  if (i < total - 1) await p.getByText(`Card ${pad(i + 2)} / ${pad(total)}`).waitFor();
}
await p.getByRole("heading", { name: "That's today's review." }).waitFor();
log(
  "finish:",
  (await p.locator("main section").last().innerText()).replace(/\s+/g, " ").slice(0, 160),
);
log(
  "schedule:",
  sql(
    "select string_agg(r.rating || '→' || to_char((c.fsrs->>'due')::timestamptz, 'Mon DD'), ', ') from reviews r join cards c on c.id = r.card_id",
  ),
);
log(
  "activity:",
  sql(
    "select string_agg(day || ' read=' || items_read || ' reviewed=' || cards_reviewed, '; ') from activity",
  ),
);

// 6. Cap: 5 due cards with cap 2 → 2 in the queue
sql(
  "insert into settings (user_id, review_cap) select id, 2 from auth.users on conflict (user_id) do update set review_cap = 2",
);
sql("delete from reviews");
sql("update cards set fsrs = jsonb_set(fsrs, '{due}', to_jsonb('2026-10-01T00:00:00.000Z'::text))");
await p.goto(`${BASE}/review`);
log(
  "with cap 2 and",
  sql("select count(*) from cards"),
  "due:",
  await p.getByText(/Card 01 \/ \d+/).innerText(),
);
sql("update settings set review_cap = 10");

// 7. Library: lists, search, remove + undo
await p.goto(`${BASE}/library`);
log(
  "library:",
  await p.getByRole("heading", { name: /^Kept/ }).innerText(),
  "|",
  await p.getByRole("heading", { name: /^Highlights/ }).innerText(),
);
await p.getByLabel("Search your library").fill("judgement");
await p.getByRole("button", { name: "Search" }).click();
await p.waitForURL(/q=judgement/);
log(
  "search 'judgement':",
  (await p.locator("main [role=status]").first().innerText()).replace(/\s+/g, " "),
  "| highlight rows:",
  await p.locator("main blockquote").count(),
);
await p.goto(`${BASE}/library`);
const keptBefore = await p.getByRole("heading", { name: /^Kept/ }).innerText();
await p.locator("main li").first().getByRole("button", { name: "Remove" }).click();
await p.getByRole("status").getByText("Removed from your Library.").waitFor();
await p.getByRole("button", { name: "Undo" }).click();
await p.getByRole("status").getByText("Undone.").waitFor();
await p.reload();
log("remove + undo:", keptBefore, "→", await p.getByRole("heading", { name: /^Kept/ }).innerText());
await p.screenshot({ path: "audit-output/p2-library-390.png", fullPage: true });
await b.close();
