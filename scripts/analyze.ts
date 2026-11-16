/**
 * Command-line check of the analysis for one or more symbols:
 *
 *   npm run analyze -- NVDA VWCE.DE SPY
 *
 * Prints the figures the app would show, to compare them with other sources.
 */
import { analyze, HORIZONS } from "@/lib/analysis";
import { fetchYahooAsset } from "@/lib/market-data/yahoo";

const pct = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined || Number.isNaN(value)
    ? "n/a"
    : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(digits)}%`;

async function report(symbol: string) {
  const { info, series } = await fetchYahooAsset(symbol, 2);
  const analysis = analyze(series, info.symbol);
  console.log(`\n=== ${info.symbol} · ${info.name} (${info.type}, ${info.exchange}, ${info.currency})`);
  if (!analysis) {
    console.log("  Not enough data to analyse.");
    return;
  }

  console.log(
    `  ${analysis.history.points} sessions since ${analysis.history.firstDate} ` +
      `(${analysis.history.years.toFixed(1)} years), last ${analysis.asOf}`,
  );
  console.log(
    `  Price ${analysis.price} · high ${analysis.high.value} on ${analysis.high.date} · ` +
      `from high ${pct(analysis.drawdown.fromHigh)} · from 52w high ${pct(analysis.drawdown.from52w)}`,
  );
  console.log(
    `  Closer to its high than today on ${pct(analysis.drawdown.percentile, 0)} of days · ` +
      `worst fall ${pct(analysis.drawdown.max)} · volatility ${pct(analysis.volatility)}`,
  );
  console.log(
    `  RSI ${analysis.rsi?.toFixed(1) ?? "n/a"} · 1m ${pct(analysis.trend.return1m)} · ` +
      `above SMA200 ${analysis.trend.aboveSma200} · long run ${pct(analysis.longRun.annualReturn)}/yr ` +
      `over ${analysis.longRun.years.toFixed(1)}y`,
  );

  for (const years of HORIZONS) {
    const horizon = analysis.horizons[years];
    if (!horizon) {
      console.log(`  ${years}y: not enough history`);
      continue;
    }
    const { evidence, expected } = horizon;
    const similar = evidence.conditional;
    console.log(
      `  ${years}y: score ${horizon.score} (${horizon.label}, confidence ${horizon.confidence}) · ` +
        `expected ${pct(expected.total)} [${pct(expected.low)} … ${pct(expected.high)}]` +
        `${expected.capped ? " (capped)" : ""}`,
    );
    console.log(
      `      similar: ${
        similar
          ? `${evidence.episodes} episodes, median ${pct(similar.median)}, up ${pct(similar.winRate, 0)}`
          : "none"
      } · any day: median ${pct(evidence.base.median)}, up ${pct(evidence.base.winRate, 0)}`,
    );
    console.log(
      `      factors: ${horizon.factors.map((f) => `${f.id} ${f.score.toFixed(0)}`).join(", ")}`,
    );
    console.log(`      reasons: ${horizon.reasons.map((r) => `${r.key}(${r.tone})`).join(", ")}`);
  }
}

async function main() {
  const symbols = process.argv.slice(2);
  if (symbols.length === 0) {
    console.error("Usage: npm run analyze -- SYMBOL [SYMBOL...]");
    process.exit(1);
  }
  for (const symbol of symbols) {
    try {
      await report(symbol.toUpperCase());
    } catch (error) {
      console.error(`\n=== ${symbol}: ${error instanceof Error ? error.message : error}`);
      process.exitCode = 1;
    }
  }
}

main();
