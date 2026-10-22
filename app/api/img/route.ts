import type { NextRequest } from "next/server";
import { verifyImageSignature } from "@/lib/images";
import { parseWidth, serveResized } from "@/lib/image-proxy";

/** Signed proxy for arbitrary images inside article bodies. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const url = params.get("u") ?? "";
  const width = parseWidth(params.get("w"));
  if (!width) return new Response("Bad width", { status: 400 });
  if (!url || !verifyImageSignature(url, width, params.get("s") ?? "")) {
    return new Response("Bad signature", { status: 403 });
  }
  return serveResized(url, width);
}
