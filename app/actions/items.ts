"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { READ_THRESHOLD } from "@/lib/feed/select";
import { bumpActivity, createHighlightWithCard, rebuildCard } from "@/lib/srs/cards";
import { removeHighlight, restoreHighlight, type HighlightSnapshot } from "./highlights";
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
  /** The keep-highlight (and its card) this Keep created, removed again on Undo. */
  createdHighlightId?: string;
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

/**
 * One tap: kept. A kept item also becomes a recall card ("What was the key idea of …?"), via a
 * note-less highlight. Returns the previous row (and what was created) for Undo.
 */
export async function keepItem(itemId: string): Promise<Snapshot> {
  const now = new Date().toISOString();
  const before = await write(itemId, { state: "kept", kept_at: now, last_opened_at: now });
  const { user, supabase } = await context(itemId);
  if (!(await keepHighlightId(supabase, itemId))) {
    const { highlightId } = await createHighlightWithCard(supabase, user.id, itemId, {});
    before.createdHighlightId = highlightId;
  }
  refresh();
  return before;
}

/** The note-less, text-less highlight that stands for "I kept this item". */
async function keepHighlightId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("highlights")
    .select("id")
    .eq("item_id", itemId)
    .is("text", null)
    .is("image_url", null)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
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
  if (snapshot.createdHighlightId) {
    await supabase.from("highlights").delete().eq("id", snapshot.createdHighlightId);
  }
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

/** The optional "one thing to remember" after Keep. It becomes the answer on the item's card. */
export async function saveKeepNote(itemId: string, note: string): Promise<void> {
  const text = note.trim().slice(0, 1000);
  if (!text) return;
  const { user, supabase } = await context(itemId);
  const id = await keepHighlightId(supabase, itemId);
  if (id) {
    await supabase.from("highlights").update({ note: text }).eq("id", id);
    await rebuildCard(supabase, id);
  } else {
    await createHighlightWithCard(supabase, user.id, itemId, { note: text });
  }
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
  if (finishing) await bumpActivity(supabase, user.id, "items_read");
}

export type UnkeepSnapshot = { item: Snapshot; keepHighlight: HighlightSnapshot | null };

/**
 * Take an item out of the Library: it's no longer kept and its "key idea" card goes too.
 * Highlights made while reading stay, since you chose those separately. Undo puts it all back.
 */
export async function unkeepItem(itemId: string): Promise<UnkeepSnapshot> {
  const { supabase } = await context(itemId);
  const id = await keepHighlightId(supabase, itemId);
  const keepHighlight = id ? await removeHighlight(id) : null;
  const item = await write(itemId, { state: "read", kept_at: null });
  refresh();
  return { item, keepHighlight };
}

export async function restoreKept(itemId: string, snapshot: UnkeepSnapshot): Promise<void> {
  await restoreItem(itemId, snapshot.item);
  if (snapshot.keepHighlight) await restoreHighlight(snapshot.keepHighlight);
}
