"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { READ_THRESHOLD, startOfDay } from "@/lib/feed/select";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type State = Database["public"]["Enums"]["user_item_state"];

/** What the user_items row looked like before an action, so Undo can put it back exactly. */
export type Snapshot = {
  existed: boolean;
  state: State | null;
  resume_position: number | null;
  last_opened_at: string | null;
  kept_at: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function context(itemId: string) {
  if (!UUID.test(itemId)) throw new Error("Bad item id");
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_items")
    .select("state, resume_position, last_opened_at, kept_at")
    .eq("user_id", user.id)
    .eq("item_id", itemId)
    .maybeSingle();
  const snapshot: Snapshot = data
    ? { existed: true, ...data }
    : { existed: false, state: null, resume_position: null, last_opened_at: null, kept_at: null };
  return { user, supabase, snapshot };
}

type Patch = {
  state?: State;
  resume_position?: number | null;
  last_opened_at?: string | null;
  kept_at?: string | null;
};

async function write(itemId: string, patch: Patch) {
  const { user, supabase, snapshot } = await context(itemId);
  const { error } = await supabase.from("user_items").upsert({
    user_id: user.id,
    item_id: itemId,
    state: snapshot.state ?? "new",
    ...patch,
  });
  if (error) throw new Error(error.message);
  return snapshot;
}

/** One tap: kept. Returns the previous row for Undo. */
export async function keepItem(itemId: string): Promise<Snapshot> {
  const now = new Date().toISOString();
  const before = await write(itemId, { state: "kept", kept_at: now, last_opened_at: now });
  refresh();
  return before;
}

export async function skipItem(itemId: string): Promise<Snapshot> {
  const before = await write(itemId, {
    state: "skipped",
    last_opened_at: new Date().toISOString(),
  });
  refresh();
  return before;
}

export async function restoreItem(itemId: string, snapshot: Snapshot): Promise<void> {
  const { user, supabase } = await context(itemId);
  if (!snapshot.existed) {
    await supabase.from("user_items").delete().eq("user_id", user.id).eq("item_id", itemId);
  } else {
    await supabase.from("user_items").upsert({
      user_id: user.id,
      item_id: itemId,
      state: snapshot.state ?? "new",
      resume_position: snapshot.resume_position,
      last_opened_at: snapshot.last_opened_at,
      kept_at: snapshot.kept_at,
    });
  }
  refresh();
}

/** The optional "one thing to remember" after Keep. Becomes a highlight (cards come in Phase 2). */
export async function saveKeepNote(itemId: string, note: string): Promise<void> {
  const text = note.trim().slice(0, 1000);
  if (!text) return;
  const { user, supabase } = await context(itemId);
  const { error } = await supabase
    .from("highlights")
    .insert({ user_id: user.id, item_id: itemId, note: text });
  if (error) throw new Error(error.message);
}

export async function markOpened(itemId: string): Promise<void> {
  await write(itemId, { last_opened_at: new Date().toISOString() });
}

/** Debounced from the Reader. Crossing 90% marks the item read and counts a learning day. */
export async function saveProgress(itemId: string, position: number): Promise<void> {
  const p = Math.min(1, Math.max(0, Number.isFinite(position) ? position : 0));
  const { user, supabase, snapshot } = await context(itemId);
  const finishing = p >= READ_THRESHOLD && (snapshot.state === null || snapshot.state === "new");
  await supabase.from("user_items").upsert({
    user_id: user.id,
    item_id: itemId,
    state: finishing ? "read" : (snapshot.state ?? "new"),
    resume_position: p,
    last_opened_at: new Date().toISOString(),
  });
  if (finishing) await countRead(supabase, user.id);
}

async function countRead(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const day = startOfDay(new Date(), process.env.APP_TIMEZONE || "UTC").toLocaleDateString(
    "en-CA",
    { timeZone: process.env.APP_TIMEZONE || "UTC" },
  );
  const { data } = await supabase
    .from("activity")
    .select("items_read")
    .eq("user_id", userId)
    .eq("day", day)
    .maybeSingle();
  await supabase
    .from("activity")
    .upsert({ user_id: userId, day, items_read: (data?.items_read ?? 0) + 1 });
}
