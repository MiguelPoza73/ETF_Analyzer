/**
 * Builds the data behind the opportunities ranking:
 *
 *   npm run snapshot                 -> writes snapshot-out/
 *   npm run snapshot -- --seed       -> also refreshes src/data/seed-snapshot.json
 *   npm run snapshot -- --out DIR    -> writes to DIR instead
 *
 * Output:
 *   ranking.json            score and key figures of every ETF in the universe
 *   history/<SYMBOL>.json   price history, used as a fallback when Yahoo is unreachable
 *
 * A scheduled GitHub Action runs this and publishes the result on the `data`
 * branch, where the app reads it.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { UNIVERSE } from "@/data/universe";
import { analyze } from "@/lib/analysis";
import { fetchYahooAsset } from "@/lib/market-data/yahoo";
import type { AssetData, RankingItem, RankingSnapshot } from "@/lib/market-data/types";

const SEED_PATH = path.join("src", "data", "seed-snapshot.json");
const PAUSE_BETWEEN_REQUESTS_MS = 400;
const SPARK_SESSIONS = 260;
const SPARK_STEP = 5;
/** Below this share of the universe the run is treated as failed. */
const MIN_SUCCESS_RATE = 0.5;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function option(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? null) : null;
}

/** Roughly one close per week over the last year, oldest first. */
function sparkline(closes: number[]): number[] {
  const recent = closes.slice(-SPARK_SESSIONS);
  const points: number[] = [];
  for (let i = (recent.length - 1) % SPARK_STEP; i < recent.length; i += SPARK_STEP) {
    points.push(Number(recent[i].toPrecision(5)));
  }
  return points;
}

function rankingItem(data: AssetData, category: RankingItem["category"]): RankingItem | null {
  const analysis = analyze(data.series, data.info.symbol);
  const oneYear = analysis?.horizons[1];
  if (!analysis || !oneYear) return null;
  const round = (value: number) => Number(value.toFixed(4));
  return {
    symbol: data.info.symbol,
    name: data.info.name,
    category,
    exchange: data.info.exchange,
    currency: data.info.currency,
    price: analysis.price,
    asOf: analysis.asOf,
    score: oneYear.score,
    label: oneYear.label,
    confidence: oneYear.confidence,
    drawdown: round(analysis.drawdown.fromHigh),
    expected: round(oneYear.expected.total),
    low: round(oneYear.expected.low),
    high: round(oneYear.expected.high),
    spark: sparkline(data.series.closes),
  };
}

async function main() {
  const outDir = option("--out") ?? "snapshot-out";
  const writeSeed = process.argv.includes("--seed");
  await mkdir(path.join(outDir, "history"), { recursive: true });

  const items: RankingItem[] = [];
  const failures: string[] = [];

  for (const entry of UNIVERSE) {
    try {
      const data = await fetchYahooAsset(entry.symbol, 3);
      const item = rankingItem(data, entry.category);
      if (!item) {
        failures.push(`${entry.symbol}: not enough history`);
        continue;
      }
      items.push(item);
      await writeFile(
        path.join(outDir, "history", `${encodeURIComponent(entry.symbol)}.json`),
        JSON.stringify(data),
      );
      console.log(`ok   ${entry.symbol.padEnd(9)} score ${String(item.score).padStart(3)}  ${item.name}`);
    } catch (error) {
      failures.push(`${entry.symbol}: ${error instanceof Error ? error.message : String(error)}`);
      console.log(`FAIL ${entry.symbol}`);
    }
    await wait(PAUSE_BETWEEN_REQUESTS_MS);
  }

  items.sort((a, b) => b.score - a.score || a.symbol.localeCompare(b.symbol));
  const snapshot: RankingSnapshot = { generatedAt: new Date().toISOString(), items };
  const json = JSON.stringify(snapshot);
  await writeFile(path.join(outDir, "ranking.json"), json);
  if (writeSeed) await writeFile(SEED_PATH, json);

  console.log(`\n${items.length} of ${UNIVERSE.length} ETFs written to ${outDir}`);
  if (failures.length > 0) console.log(`Skipped:\n  ${failures.join("\n  ")}`);

  if (items.length < UNIVERSE.length * MIN_SUCCESS_RATE) {
    console.error("Too many failures: the snapshot should not be published.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
