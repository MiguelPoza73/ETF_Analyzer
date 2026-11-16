import { ANALYSIS_CONFIG, type HorizonYears } from "./config";
import { annualize, clamp, compound, scale } from "./stats";
import type {
  Confidence,
  Evidence,
  ExpectedReturn,
  Factor,
  TrendState,
  VerdictLabel,
} from "./types";

/**
 * Expected return over the horizon: what happened after similar situations,
 * blended with the asset's normal behaviour (more episodes, more weight) and
 * pulled towards a market reference when the asset has little history.
 */
export function expectedReturn(
  evidence: Evidence,
  horizonYears: HorizonYears,
  historyYears: number,
): ExpectedReturn {
  const {
    marketPriorAnnual,
    fullHistoryYears,
    expectedCapAnnual,
    expectedFloorAnnual,
    optimisticCapAnnual,
  } = ANALYSIS_CONFIG;
  const { base, conditional, weight } = evidence;

  const blend = (pick: (stats: typeof base) => number) =>
    conditional ? weight * pick(conditional) + (1 - weight) * pick(base) : pick(base);

  const historyWeight = clamp(historyYears / fullHistoryYears, 0, 1);
  const prior = compound(marketPriorAnnual, horizonYears);
  const uncapped = historyWeight * blend((s) => s.median) + (1 - historyWeight) * prior;

  const ceiling = compound(expectedCapAnnual[horizonYears], horizonYears);
  const floor = compound(expectedFloorAnnual, horizonYears);
  const total = clamp(uncapped, floor, ceiling);

  // The range is what history showed, with a ceiling on the optimistic end so
  // that assets with an extraordinary past do not promise an extraordinary future.
  const optimisticCeiling = compound(optimisticCapAnnual[horizonYears], horizonYears);
  const historicalHigh = blend((s) => s.p90);
  const low = Math.min(blend((s) => s.p10), total);
  const high = Math.max(Math.min(historicalHigh, optimisticCeiling), total);

  const edge = conditional
    ? weight *
      (annualize(conditional.median, horizonYears) - annualize(base.median, horizonYears))
    : 0;

  return {
    total,
    annualized: annualize(total, horizonYears),
    low,
    high,
    winRate: blend((s) => s.winRate),
    edge,
    capped: uncapped > ceiling || historicalHigh > optimisticCeiling,
  };
}

/** Half "how unusual is this discount for this asset", half "how big is it". */
export function scoreDiscount(drawdownFromHigh: number, percentile: number): number {
  const relative = clamp(percentile, 0, 1) * 100;
  const absolute = scale(-drawdownFromHigh, 0, ANALYSIS_CONFIG.discount.fullAt);
  return 0.5 * relative + 0.5 * absolute;
}

/**
 * Three parts: how often it went up, how much is expected, and whether
 * situations like today's turned out better than an ordinary day.
 */
export function scoreEvidence(expected: ExpectedReturn): number {
  const { winRate, annualReturn, edge, parts } = ANALYSIS_CONFIG.evidence;
  return (
    parts.winRate * scale(expected.winRate, winRate[0], winRate[1]) +
    parts.annualReturn * scale(expected.annualized, annualReturn[0], annualReturn[1]) +
    parts.edge * scale(expected.edge, edge[0], edge[1])
  );
}

/** Four checks worth 25 points each. */
export function scoreTrend(trend: TrendState): number {
  const checks = [
    trend.aboveSma200,
    trend.sma50AboveSma200,
    trend.sma200Rising,
    trend.return1m === null ? null : trend.return1m > 0,
  ];
  return checks.reduce((total, check) => total + (check ? 25 : 0), 0);
}

/** Oversold scores high, overbought scores low. */
export function scoreMomentum(rsi: number | null): number {
  if (rsi === null) return 50;
  const { oversold, overbought } = ANALYSIS_CONFIG.rsi;
  return 100 - scale(rsi, oversold, overbought);
}

export function scoreLongRun(annualReturn: number): number {
  return scale(annualReturn, 0, ANALYSIS_CONFIG.longRun.fullAt);
}

export function totalScore(factors: Factor[]): number {
  return factors.reduce((total, factor) => total + factor.score * factor.weight, 0);
}

export function labelFor(score: number): VerdictLabel {
  const { buy, neutral } = ANALYSIS_CONFIG.labels;
  if (score >= buy) return "buy";
  if (score >= neutral) return "neutral";
  return "wait";
}

export function confidenceFor(historyYears: number, evidence: Evidence): Confidence {
  const { highYears, highEpisodes, lowYears } = ANALYSIS_CONFIG.confidence;
  if (historyYears < lowYears || evidence.weight === 0) return "low";
  if (historyYears >= highYears && evidence.episodes >= highEpisodes) return "high";
  return "medium";
}
