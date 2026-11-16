import type { NextRequest } from "next/server";
import { searchAssets } from "@/lib/market-data/provider";

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 60;

/** GET /api/search?q=... — autocomplete for the search box. */
export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (query.length < MIN_QUERY_LENGTH || query.length > MAX_QUERY_LENGTH) {
    return Response.json({ ok: true, hits: [] });
  }

  const result = await searchAssets(query);
  if (!result.ok) {
    return Response.json(result, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json(result, {
    // Let the CDN answer repeated searches without reaching the server.
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
