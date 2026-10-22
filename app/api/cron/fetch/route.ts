import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { runIngest } from "@/lib/ingest/run";
import { supabaseIngestStore } from "@/lib/ingest/supabase-store";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * Scheduled fetch. Called every 2 hours by .github/workflows/fetch-feeds.yml with
 * `Authorization: Bearer $CRON_SECRET`. Works through due sources within a time budget;
 * anything left over is picked up next run.
 */
export async function GET(request: NextRequest) {
  if (!authorised(request.headers.get("authorization"))) {
    return Response.json({ error: "unauthorised" }, { status: 401 });
  }
  const summary = await runIngest(supabaseIngestStore(createAdminClient()), { budgetMs: 45_000 });
  const failed = summary.sources.filter((s) => s.status === "error").length;
  return Response.json({
    ok: true,
    sources: summary.sources.length,
    newItems: summary.sources.reduce((n, s) => n + s.newItems, 0),
    failed,
    outOfTime: summary.outOfTime,
    ms: summary.ms,
  });
}

export const POST = GET;

function authorised(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
