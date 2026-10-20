import type { NextRequest } from "next/server";
import { parseWidth, serveResized, unavailable } from "@/lib/image-proxy";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const leadUrls = new Map<string, string | null>();

/**
 * An item's lead image by id. Short URLs keep card markup small, and only images the ingest
 * job already chose can be fetched, so no signature is needed. Items never change their image.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/img/item/[id]">) {
  const { id } = await params;
  const width = parseWidth(request.nextUrl.searchParams.get("w"));
  if (!width || !UUID.test(id)) return new Response("Bad request", { status: 400 });

  let url = leadUrls.get(id);
  if (url === undefined) {
    const { data } = await createAdminClient()
      .from("items")
      .select("lead_image_url")
      .eq("id", id)
      .maybeSingle();
    url = data?.lead_image_url ?? null;
    if (leadUrls.size > 5000) leadUrls.clear();
    leadUrls.set(id, url);
  }
  return url ? serveResized(url, width) : unavailable();
}
