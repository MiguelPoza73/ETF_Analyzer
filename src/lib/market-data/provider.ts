import { cacheLife } from "next/cache";
import { analyze, type Analysis, type PriceSeries } from "@/lib/analysis";
import { fetchRanking, fetchSnapshotAsset } from "./snapshot";
import {
  AssetNotFoundError,
  type AssetData,
  type AssetInfo,
  type RankingSnapshot,
  type SearchHit,
} from "./types";
import { fetchYahooAsset, searchYahoo } from "./yahoo";

/**
 * Cached entry points used by pages and route handlers. Prices are daily, so
 * a few hours of caching keeps the app fast and the data provider unbothered.
 */

const HOUR = 3600;
const DAY = 24 * HOUR;

/** Lifetime of market data: refreshed in the background after 6 hours. */
const MARKET_DATA = { stale: 300, revalidate: 6 * HOUR, expire: 7 * DAY };

export type AssetResult =
  | {
      status: "ok";
      info: AssetInfo;
      series: PriceSeries;
      analysis: Analysis;
      /** "snapshot" when Yahoo failed and saved data is shown instead. */
      source: "live" | "snapshot";
    }
  | { status: "not_found" }
  | { status: "unavailable" };

async function fetchAsset(
  symbol: string,
): Promise<{ data: AssetData; source: "live" | "snapshot" } | "not_found" | "unavailable"> {
  try {
    return { data: await fetchYahooAsset(symbol), source: "live" };
  } catch (error) {
    if (error instanceof AssetNotFoundError) return "not_found";
    console.error(`[market-data] ${symbol}:`, error);
    const saved = await fetchSnapshotAsset(symbol);
    return saved ? { data: saved, source: "snapshot" } : "unavailable";
  }
}

/** Price history and full analysis of an asset. `symbol` must already be normalised. */
export async function loadAsset(symbol: string): Promise<AssetResult> {
  "use cache";

  const result = await fetchAsset(symbol);
  if (result === "not_found") {
    cacheLife("hours");
    return { status: "not_found" };
  }
  if (result === "unavailable") {
    // Try again soon.
    cacheLife("minutes");
    return { status: "unavailable" };
  }

  const { data, source } = result;
  const analysis = analyze(data.series, data.info.symbol);
  if (!analysis) {
    cacheLife("hours");
    return { status: "not_found" };
  }

  if (source === "live") {
    cacheLife(MARKET_DATA);
  } else {
    // Saved data is a stopgap: look for live data again soon.
    cacheLife("minutes");
  }
  return { status: "ok", info: data.info, series: data.series, analysis, source };
}

export type SearchResult = { ok: true; hits: SearchHit[] } | { ok: false };

/** Assets matching a name, ticker or ISIN. `query` must already be normalised. */
export async function searchAssets(query: string): Promise<SearchResult> {
  "use cache";

  try {
    const hits = await searchYahoo(query);
    cacheLife("days");
    return { ok: true, hits };
  } catch (error) {
    console.error(`[market-data] search "${query}":`, error);
    cacheLife("minutes");
    return { ok: false };
  }
}

/** The opportunities ranking. */
export async function loadRanking(): Promise<RankingSnapshot> {
  "use cache";
  cacheLife("hours");
  return fetchRanking();
}
