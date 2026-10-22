import "server-only";
import { requireUser } from "@/lib/auth";
import { playerSrc } from "@/lib/reader/video";
import { DEFAULT_PREFS, normalisePrefs, type Prefs } from "@/lib/prefs";
import { itemImageSet, proxiedImage, type ImageSet } from "@/lib/images";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import {
  BOARD_LIMIT,
  FRESH_DAYS,
  READ_THRESHOLD,
  batchGoal,
  matchesTime,
  pickBatch,
  startOfDay,
  type TimeChip,
} from "@/lib/feed/select";

type FeedRow = Database["public"]["Views"]["feed_items"]["Row"];
type ItemType = Database["public"]["Enums"]["item_type"];
export type ItemState = Database["public"]["Enums"]["user_item_state"];

export type CardItem = {
  id: string;
  title: string;
  url: string;
  summary: string | null;
  type: ItemType;
  image: (ImageSet & { width: number; height: number }) | null;
  readMinutes: number | null;
  durationSeconds: number | null;
  sortAt: string;
  sourceId: string;
  sourceTitle: string;
  topicIds: string[];
  state: ItemState | null;
  resumePosition: number;
};

export const CARD_COLUMNS =
  "id, source_id, url, title, summary, type, lead_image_url, lead_image_width, lead_image_height, read_minutes, duration_seconds, sort_at, source_title, source_site_url, state, resume_position, last_opened_at, topic_ids";

export function toCard(row: Partial<FeedRow>): CardItem {
  const hasImage = row.lead_image_url && row.lead_image_width && row.lead_image_height;
  return {
    id: row.id!,
    title: row.title ?? "Untitled",
    url: row.url!,
    summary: row.summary ?? null,
    type: row.type ?? "article",
    image: hasImage
      ? {
          ...itemImageSet(row.id!),
          width: row.lead_image_width!,
          height: row.lead_image_height!,
        }
      : null,
    readMinutes: row.read_minutes ?? null,
    durationSeconds: row.duration_seconds ?? null,
    sortAt: row.sort_at ?? new Date(0).toISOString(),
    sourceId: row.source_id!,
    sourceTitle: row.source_title ?? hostOf(row.source_site_url ?? row.url ?? ""),
    topicIds: row.topic_ids ?? [],
    state: row.state ?? null,
    resumePosition: row.resume_position ?? 0,
  };
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const timeZone = () => process.env.APP_TIMEZONE || "UTC";
export const freshSince = () => new Date(Date.now() - FRESH_DAYS * 86_400_000).toISOString();

export type Settings = Prefs;

export async function getSettings(): Promise<Settings> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("density, motion, autoplay, captions, text_size, daily_goal, review_cap, calm_mode")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return DEFAULT_PREFS;
  return normalisePrefs({
    density: data.density,
    motion: data.motion,
    autoplay: data.autoplay,
    captions: data.captions,
    textSize: data.text_size,
    dailyGoal: data.daily_goal,
    reviewCap: data.review_cap,
    calmMode: data.calm_mode,
  });
}

export type TodayData = {
  sourceCount: number;
  goal: number;
  doneToday: number;
  batch: CardItem[];
  continueItems: CardItem[];
};

/** Unhandled = never touched: no state yet, or 'new' and never opened. */
export const UNHANDLED = "state.is.null,and(state.eq.new,last_opened_at.is.null)";

export async function getToday(): Promise<TodayData> {
  const user = await requireUser();
  const supabase = await createClient();
  const dayStart = startOfDay(new Date(), timeZone()).toISOString();

  const [settings, sources, done, fresh, cont] = await Promise.all([
    getSettings(),
    supabase.from("sources").select("id", { count: "exact", head: true }),
    supabase
      .from("user_items")
      .select("item_id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("last_opened_at", dayStart),
    supabase
      .from("feed_items")
      .select(CARD_COLUMNS)
      .eq("muted", false)
      .or(UNHANDLED)
      .gte("sort_at", freshSince())
      .order("sort_at", { ascending: false })
      .limit(60),
    supabase
      .from("feed_items")
      .select(CARD_COLUMNS)
      .in("state", ["new", "kept"])
      .not("last_opened_at", "is", null)
      .or(`resume_position.is.null,resume_position.lt.${READ_THRESHOLD}`)
      .order("last_opened_at", { ascending: false })
      .limit(6),
  ]);

  const goal = batchGoal(settings.dailyGoal);
  const doneToday = done.count ?? 0;
  return {
    sourceCount: sources.count ?? 0,
    goal,
    doneToday,
    batch: pickBatch((fresh.data ?? []).map(toCard), goal - doneToday),
    continueItems: (cont.data ?? []).map(toCard),
  };
}

export type ExploreFilter = { topic?: string; source?: string; time: TimeChip };

export type ExploreData = { items: CardItem[]; more: number };

export async function getExplore(filter: ExploreFilter): Promise<ExploreData> {
  await requireUser();
  const supabase = await createClient();
  let q = supabase
    .from("feed_items")
    .select(CARD_COLUMNS)
    .eq("muted", false)
    .or(UNHANDLED)
    .gte("sort_at", freshSince())
    .order("sort_at", { ascending: false })
    .limit(200);
  if (filter.source) q = q.eq("source_id", filter.source);
  if (filter.topic) q = q.contains("topic_ids", [filter.topic]);
  const { data } = await q;
  const matching = (data ?? []).map(toCard).filter((i) => matchesTime(i, filter.time));
  return {
    items: matching.slice(0, BOARD_LIMIT),
    more: Math.max(0, matching.length - BOARD_LIMIT),
  };
}

export type WatchItem = CardItem & { player: string | null; poster: string | null };

/** Unhandled videos for Watch mode, with a player URL built from each video's id. */
export async function getWatchItems(
  filter: { topic?: string; source?: string },
  captions: boolean,
): Promise<WatchItem[]> {
  const { items } = await getExplore({ ...filter, time: "video" });
  if (!items.length) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("items")
    .select("id, embed_html")
    .in(
      "id",
      items.map((i) => i.id),
    );
  const embeds = new Map((data ?? []).map((r) => [r.id, r.embed_html]));
  return items.map((i) => ({
    ...i,
    player: playerSrc(i.url, embeds.get(i.id) ?? null, { muted: true, captions }),
    poster: i.image ? itemImageSet(i.id, [960]).src : null,
  }));
}

export type ReaderHighlight = {
  id: string;
  text: string | null;
  /** Proxied, for display. */
  image: string | null;
  note: string | null;
};

export type ReaderItem = CardItem & {
  highlights: ReaderHighlight[];
  bodyHtml: string | null;
  embedHtml: string | null;
  sourceSiteUrl: string | null;
  publishedAt: string | null;
  keptAt: string | null;
};

export async function getReaderItem(id: string): Promise<ReaderItem | null> {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data }, { data: highlightRows }] = await Promise.all([
    supabase
      .from("items")
      .select(
        "id, source_id, url, title, summary, type, lead_image_url, lead_image_width, lead_image_height, read_minutes, duration_seconds, published_at, created_at, body_html, embed_html, sources(title, site_url), user_items(state, resume_position, kept_at, user_id)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("highlights")
      .select("id, text, image_url, note")
      .eq("item_id", id)
      .eq("user_id", user.id)
      .order("created_at"),
  ]);
  if (!data) return null;
  const mine = data.user_items.find((u) => u.user_id === user.id);
  const card = toCard({
    ...data,
    sort_at: data.published_at ?? data.created_at,
    source_title: data.sources?.title ?? null,
    source_site_url: data.sources?.site_url ?? null,
    state: mine?.state ?? null,
    resume_position: mine?.resume_position ?? null,
  });
  // Reader heroes are bigger than cards. Rows without stored dimensions get a 16:9 frame.
  const hero = data.lead_image_url
    ? {
        ...itemImageSet(data.id, [480, 640, 960, 1280]),
        width: data.lead_image_width ?? 16,
        height: data.lead_image_height ?? 9,
      }
    : null;
  return {
    ...card,
    image: hero,
    // The text-less, image-less highlight just stands for "kept"; it has no passage to show.
    highlights: (highlightRows ?? [])
      .filter((h) => h.text || h.image_url)
      .map((h) => ({
        id: h.id,
        text: h.text,
        image: h.image_url ? proxiedImage(h.image_url, 480) : null,
        note: h.note,
      })),
    bodyHtml: data.body_html,
    embedHtml: data.embed_html,
    sourceSiteUrl: data.sources?.site_url ?? null,
    publishedAt: data.published_at,
    keptAt: mine?.kept_at ?? null,
  };
}

export type TopicRow = { id: string; name: string; color: string | null };

export async function getTopics(): Promise<TopicRow[]> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("topics").select("id, name, color").order("name");
  return data ?? [];
}

export type SourceRow = {
  id: string;
  title: string;
  siteUrl: string;
  feedUrl: string;
  muted: boolean;
  topicIds: string[];
  lastFetchedAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  /** Minutes since the last check, or null if never checked. */
  checkedMinutesAgo: number | null;
};

export async function getSources(): Promise<SourceRow[]> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("sources")
    .select(
      "id, title, site_url, feed_url, muted, topic_ids, last_fetched_at, last_status, last_error",
    )
    .order("title");
  const now = Date.now();
  return (data ?? []).map((s) => ({
    id: s.id,
    title: s.title || hostOf(s.site_url),
    siteUrl: s.site_url,
    feedUrl: s.feed_url,
    muted: s.muted,
    topicIds: s.topic_ids,
    lastFetchedAt: s.last_fetched_at,
    lastStatus: s.last_status,
    lastError: s.last_error,
    checkedMinutesAgo: s.last_fetched_at
      ? Math.max(0, Math.round((now - new Date(s.last_fetched_at).getTime()) / 60_000))
      : null,
  }));
}
