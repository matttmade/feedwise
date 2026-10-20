/**
 * Phase 0 ingestion spike: discover → fetch → enrich for real sites.
 *
 *   pnpm spike <url...>                 ad-hoc sites (type not checked)
 *   pnpm spike --sites spike/sites.json named sites with expected types
 *
 * Options: --items N (default 5) · --report path (default spike-report.md)
 *          --json path (default spike-output/spike.json) · --full (print body HTML)
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { discoverFeeds } from "../lib/ingest/discover";
import { fetchFeed } from "../lib/ingest/fetch";
import { enrichItem } from "../lib/ingest/enrich";
import { errorMessage, httpGet, mapLimit } from "../lib/ingest/http";
import type { DiscoverResult, EnrichedItem, ItemType } from "../lib/ingest/types";

type Site = { name: string; url: string | null; expect?: ItemType[]; role?: string; note?: string };

type CheckedItem = EnrichedItem & { imageLoads: boolean | null; card: boolean };

type SiteResult = {
  site: Site;
  discover?: DiscoverResult;
  feedUrl?: string;
  feedTitle?: string;
  feedError?: string;
  totalItems: number;
  items: CheckedItem[];
  cards: number;
  pass: boolean;
  ms: number;
};

/** A site passes when at least this share of sampled items make a full card… */
const PASS_RATIO = 0.6;
/** …and the feed has enough items to judge (a 1-item feed is usually a placeholder). */
const MIN_ITEMS = 3;

function parseArgs(argv: string[]) {
  const opts = {
    items: 5,
    report: "spike-report.md",
    json: "spike-output/spike.json",
    full: false,
  };
  const urls: string[] = [];
  let sitesFile: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--items") opts.items = Number(argv[++i]);
    else if (a === "--report") opts.report = argv[++i];
    else if (a === "--json") opts.json = argv[++i];
    else if (a === "--sites") sitesFile = argv[++i];
    else if (a === "--full") opts.full = true;
    else if (a !== "--") urls.push(a);
  }
  return { opts, urls, sitesFile };
}

async function imageLoads(url: string): Promise<boolean> {
  try {
    const res = await httpGet(url, { accept: "image/*" });
    return res.ok && /^image\//i.test(res.contentType);
  } catch {
    return false;
  }
}

async function runSite(site: Site, maxItems: number): Promise<SiteResult> {
  const started = Date.now();
  const result: SiteResult = { site, totalItems: 0, items: [], cards: 0, pass: false, ms: 0 };
  const done = () => ({ ...result, ms: Date.now() - started });
  if (!site.url) return done();

  try {
    result.discover = await discoverFeeds(site.url);
  } catch (err) {
    result.feedError = `discover failed: ${errorMessage(err)}`;
    return done();
  }
  const feed = result.discover.feeds[0];
  if (!feed) return done();
  result.feedUrl = feed.url;

  const fetched = await fetchFeed({ url: feed.url });
  if (fetched.status !== "ok") {
    result.feedError = fetched.status === "error" ? fetched.error : "304 on first fetch";
    return done();
  }
  result.feedTitle = fetched.feed.title;
  result.totalItems = fetched.feed.items.length;

  const sample = fetched.feed.items.slice(0, maxItems);
  // One request at a time per host: polite, and avoids tripping rate limits (NN/g timed out at 3).
  result.items = await mapLimit(sample, 1, async (raw) => {
    const item = await enrichItem(raw, { siteImage: result.discover?.siteImage });
    const loads = item.leadImageUrl ? await imageLoads(item.leadImageUrl) : null;
    const typeOk = !site.expect || site.expect.includes(item.type);
    return { ...item, imageLoads: loads, card: Boolean(item.title && loads && typeOk) };
  });
  result.cards = result.items.filter((i) => i.card).length;
  result.pass =
    result.items.length >= Math.min(MIN_ITEMS, maxItems) &&
    result.cards / result.items.length >= PASS_RATIO;
  return done();
}

function cost(i: EnrichedItem): string {
  if (i.durationSeconds) {
    const m = Math.floor(i.durationSeconds / 60);
    const s = String(i.durationSeconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  }
  return i.readMinutes ? `${i.readMinutes} min read` : "—";
}

const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

function report(results: SiteResult[], maxItems: number): string {
  const tested = results.filter((r) => r.site.url);
  const passed = tested.filter((r) => r.pass).length;
  const L: string[] = [];
  L.push("# Feedwise — Phase 0 ingestion spike report", "");
  L.push(`Run: ${new Date().toISOString()} · ${maxItems} newest items sampled per site`, "");
  L.push(
    `**Card** = item has a title, a lead image that actually loads (HTTP 2xx, \`image/*\`), and a type in the site's expected set. ` +
      `**Pass** = feed found, at least ${MIN_ITEMS} items in it, and ≥ ${PASS_RATIO * 100}% of sampled items make a card.`,
    "",
  );
  L.push(`## Result: ${passed} of ${tested.length} sites passed`, "");
  if (tested.length < results.length) {
    L.push(`${results.length - tested.length} site(s) not run (no URL).`, "");
  }
  L.push("| Site | Role | Feed | Cards | Types | Verdict | Problem |");
  L.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const r of results) {
    const types = [...new Set(r.items.map((i) => i.type))].join(", ") || "—";
    const via = r.discover?.feeds[0]?.via;
    const feed = r.feedUrl ? `[${via}](${r.feedUrl})` : "none";
    const problem = !r.site.url
      ? (r.site.note ?? "no URL")
      : (r.feedError ?? (r.feedUrl ? itemProblems(r) : r.discover?.warning) ?? "");
    const verdict = !r.site.url ? "not run" : r.pass ? "✅ pass" : "❌ fail";
    L.push(
      `| ${esc(r.site.name)} | ${r.site.role ?? ""} | ${feed} | ${r.cards}/${r.items.length} | ${types} | ${verdict} | ${esc(problem)} |`,
    );
  }
  L.push("", "<!-- notes -->", "");

  for (const r of results) {
    L.push(`## ${r.site.name}`, "");
    if (!r.site.url) {
      L.push(`Not run: ${r.site.note ?? "no URL"}`, "");
      continue;
    }
    L.push(`- Site: ${r.site.url}`);
    if (r.discover?.warning) L.push(`- Discovery warning: ${r.discover.warning}`);
    L.push(
      `- Feeds found: ${r.discover?.feeds.map((f) => `${f.url} (${f.format}, via ${f.via})`).join("; ") || "none"}`,
    );
    if (r.feedError) L.push(`- Feed error: ${r.feedError}`);
    if (r.feedUrl) L.push(`- Items in feed: ${r.totalItems}`);
    L.push(
      `- Expected types: ${r.site.expect?.join(", ") ?? "any"} · time ${(r.ms / 1000).toFixed(1)}s`,
      "",
    );
    if (r.items.length) {
      L.push("| # | Title | Type | Image | Cost | Card | Notes |");
      L.push("| --- | --- | --- | --- | --- | --- | --- |");
      r.items.forEach((i, n) => {
        const img = i.leadImageUrl
          ? `[${i.leadImageSource}](${i.leadImageUrl})${i.imageLoads ? "" : " ⚠️ didn't load"}`
          : "none";
        L.push(
          `| ${n + 1} | [${esc(i.title.slice(0, 70))}](${i.url}) | ${i.type} | ${img} | ${cost(i)} | ${i.card ? "✅" : "❌"} | ${esc(i.notes.join("; "))} |`,
        );
      });
      L.push("");
    }
  }
  return L.join("\n");
}

function itemProblems(r: SiteResult): string {
  const bad = r.items.filter((i) => !i.card);
  if (!bad.length && r.items.length >= MIN_ITEMS) return "";
  const noImg = bad.filter((i) => !i.leadImageUrl).length;
  const broken = bad.filter((i) => i.leadImageUrl && !i.imageLoads).length;
  const wrongType = bad.filter((i) => r.site.expect && !r.site.expect.includes(i.type)).length;
  return [
    r.items.length < MIN_ITEMS && `only ${r.items.length} item(s) in feed`,
    noImg && `${noImg} no image`,
    broken && `${broken} image didn't load`,
    wrongType && `${wrongType} unexpected type`,
  ]
    .filter(Boolean)
    .join(", ");
}

async function main() {
  const { opts, urls, sitesFile } = parseArgs(process.argv.slice(2));
  const sites: Site[] = sitesFile
    ? JSON.parse(await readFile(sitesFile, "utf8"))
    : urls.map((url) => ({ name: url, url }));
  if (!sites.length) {
    console.error("Usage: pnpm spike <url...>  |  pnpm spike --sites spike/sites.json");
    process.exit(1);
  }

  const results = await mapLimit(sites, 4, async (site) => {
    const r = await runSite(site, opts.items);
    console.error(
      `${r.pass ? "pass" : "fail"}  ${site.name}  (${r.cards}/${r.items.length} cards)`,
    );
    return r;
  });

  const printable = results.map((r) => ({
    site: r.site.name,
    feed: r.feedUrl ?? null,
    error: r.feedError ?? r.discover?.warning ?? null,
    pass: r.pass,
    items: r.items.map((i) => ({
      ...i,
      bodyHtml: opts.full ? i.bodyHtml : i.bodyHtml ? `<${i.bodyHtml.length} chars>` : null,
      media: opts.full ? i.media : i.media.length,
    })),
  }));
  console.log(JSON.stringify(printable, null, 2));

  await mkdir(dirname(opts.json), { recursive: true });
  await writeFile(opts.json, JSON.stringify(results, null, 2));
  // Hand-written review notes survive re-runs by living in their own file.
  const notes = sitesFile ? await readFile("spike/notes.md", "utf8").catch(() => "") : "";
  await writeFile(opts.report, report(results, opts.items).replace("<!-- notes -->", notes));
  const tested = results.filter((r) => r.site.url);
  console.error(
    `\n${tested.filter((r) => r.pass).length} of ${tested.length} sites passed → ${opts.report}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
