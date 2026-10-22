"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { discoverFeeds } from "@/lib/ingest/discover";
import { errorMessage } from "@/lib/ingest/http";
import { runIngest } from "@/lib/ingest/run";
import { supabaseIngestStore } from "@/lib/ingest/supabase-store";
import type { DiscoveredFeed } from "@/lib/ingest/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type DiscoverState =
  | { status: "idle" }
  | { status: "found"; input: string; siteUrl: string; feeds: DiscoveredFeed[] }
  | { status: "none"; input: string; message: string };

export async function findFeeds(_prev: DiscoverState, form: FormData): Promise<DiscoverState> {
  await requireUser();
  const input = String(form.get("url") ?? "").trim();
  if (!input) return { status: "none", input, message: "Paste a site or YouTube channel address." };
  try {
    const result = await discoverFeeds(input);
    if (result.feeds.length)
      return { status: "found", input, siteUrl: result.siteUrl, feeds: result.feeds };
    return {
      status: "none",
      input,
      message: result.warning?.includes("bot protection")
        ? "That site blocks automated readers, so we can't follow it yet."
        : "We couldn't find a feed on that page. If the site has an RSS link, paste that instead.",
    };
  } catch (err) {
    return {
      status: "none",
      input,
      message: `We couldn't open that address (${errorMessage(err)}).`,
    };
  }
}

export type AddState = { status: "idle" | "added" | "error"; message?: string };

export async function addSource(_prev: AddState, form: FormData): Promise<AddState> {
  const user = await requireUser();
  const supabase = await createClient();
  const feedUrl = String(form.get("feedUrl") ?? "");
  const meta = parseMeta(form.get(`meta:${feedUrl}`));
  const format = meta.format;
  const siteUrl = String(form.get("siteUrl") ?? "") || feedUrl;
  const title = meta.title.trim().slice(0, 200) || null;
  if (!/^https?:\/\//.test(feedUrl) || !["rss", "atom", "json", "rdf"].includes(format)) {
    return { status: "error", message: "Pick one of the feeds above." };
  }

  const { data, error } = await supabase
    .from("sources")
    .insert({ user_id: user.id, site_url: siteUrl, feed_url: feedUrl, feed_type: format, title })
    .select("id")
    .single();
  if (error) {
    return {
      status: "error",
      message:
        error.code === "23505" ? "You already follow that feed." : "That didn't save. Try again?",
    };
  }

  // Fill it now so the new source shows up straight away rather than at the next scheduled run.
  const summary = await runIngest(supabaseIngestStore(createAdminClient()), {
    sourceId: data.id,
    maxNewPerSource: 6,
    budgetMs: 25_000,
  });
  refresh();
  const added = summary.sources[0]?.newItems ?? 0;
  return {
    status: "added",
    message: added
      ? `Added. ${added} new ${added === 1 ? "post is" : "posts are"} waiting in Explore.`
      : "Added. New posts will appear after the next check.",
  };
}

function parseMeta(value: FormDataEntryValue | null): { format: string; title: string } {
  try {
    const m = JSON.parse(String(value ?? ""));
    return { format: String(m.format ?? ""), title: String(m.title ?? "") };
  } catch {
    return { format: "", title: "" };
  }
}

async function owned(id: string) {
  const user = await requireUser();
  const supabase = await createClient();
  return { user, supabase, id };
}

export async function renameSource(id: string, title: string) {
  const { supabase } = await owned(id);
  await supabase
    .from("sources")
    .update({ title: title.trim().slice(0, 200) || null })
    .eq("id", id);
  refresh();
}

export async function setMuted(id: string, muted: boolean) {
  const { supabase } = await owned(id);
  await supabase.from("sources").update({ muted }).eq("id", id);
  refresh();
}

export async function setSourceTopics(id: string, topicIds: string[]) {
  const { supabase } = await owned(id);
  await supabase.from("sources").update({ topic_ids: topicIds }).eq("id", id);
  refresh();
}

export async function removeSource(id: string) {
  const { supabase } = await owned(id);
  await supabase.from("sources").delete().eq("id", id);
  refresh();
}

export async function createTopic(name: string): Promise<{ id: string } | null> {
  const user = await requireUser();
  const supabase = await createClient();
  const clean = name.trim().slice(0, 40);
  if (!clean) return null;
  const { data } = await supabase
    .from("topics")
    .insert({ user_id: user.id, name: clean })
    .select("id")
    .single();
  refresh();
  return data;
}
