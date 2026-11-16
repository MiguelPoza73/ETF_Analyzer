import seed from "@/data/seed-snapshot.json";
import type { AssetData, RankingSnapshot } from "./types";

const REQUEST_TIMEOUT_MS = 8000;

/**
 * Where the published snapshot lives. Set SNAPSHOT_BASE_URL to override; on
 * Vercel it defaults to the `data` branch of the repository being deployed.
 * Returns null when neither is available (local development).
 */
function snapshotBaseUrl(): string | null {
  const explicit = process.env.SNAPSHOT_BASE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const owner = process.env.VERCEL_GIT_REPO_OWNER;
  const repo = process.env.VERCEL_GIT_REPO_SLUG;
  return owner && repo ? `https://raw.githubusercontent.com/${owner}/${repo}/data` : null;
}

async function fetchSnapshotFile<T>(file: string): Promise<T | null> {
  const base = snapshotBaseUrl();
  if (!base) return null;
  try {
    const response = await fetch(`${base}/${file}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

function isRanking(value: unknown): value is RankingSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const snapshot = value as Partial<RankingSnapshot>;
  return typeof snapshot.generatedAt === "string" && Array.isArray(snapshot.items);
}

/** The published ranking, or the copy bundled with the app if it cannot be fetched. */
export async function fetchRanking(): Promise<RankingSnapshot> {
  const published = await fetchSnapshotFile<unknown>("ranking.json");
  if (isRanking(published) && published.items.length > 0) return published;
  return seed as RankingSnapshot;
}

/** Saved price history of an ETF in the ranking universe, if one was published. */
export async function fetchSnapshotAsset(symbol: string): Promise<AssetData | null> {
  const data = await fetchSnapshotFile<Partial<AssetData>>(
    `history/${encodeURIComponent(symbol)}.json`,
  );
  if (!data?.info || !Array.isArray(data.series?.closes) || !Array.isArray(data.series?.days)) {
    return null;
  }
  return data as AssetData;
}
