import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { IngestStore } from "./run";

type ItemInsert = Database["public"]["Tables"]["items"]["Insert"];

/** IngestStore over the service-role client (the cron job writes items for every user). */
export function supabaseIngestStore(db: SupabaseClient<Database>): IngestStore {
  return {
    async dueSources({ dueBefore, limit, sourceId }) {
      let q = db
        .from("sources")
        .select("id, feed_url, etag, last_modified")
        .eq("muted", false)
        .order("last_fetched_at", { ascending: true, nullsFirst: true })
        .limit(limit);
      q = sourceId
        ? q.eq("id", sourceId)
        : q.or(`last_fetched_at.is.null,last_fetched_at.lt.${dueBefore.toISOString()}`);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data;
    },
    async knownGuids(sourceId, guids) {
      const known = new Set<string>();
      // Chunked: guids are often long URLs and PostgREST filters travel in the query string.
      for (let i = 0; i < guids.length; i += 40) {
        const { data, error } = await db
          .from("items")
          .select("guid")
          .eq("source_id", sourceId)
          .in("guid", guids.slice(i, i + 40));
        if (error) throw new Error(error.message);
        data.forEach((r) => known.add(r.guid));
      }
      return known;
    },
    async insertItems(items) {
      const { error } = await db.from("items").upsert(
        items.map((i) => ({ ...i, media: i.media as unknown as ItemInsert["media"] })),
        { onConflict: "source_id,guid", ignoreDuplicates: true },
      );
      if (error) throw new Error(error.message);
    },
    async updateSource(id, patch) {
      const { error } = await db.from("sources").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
  };
}
