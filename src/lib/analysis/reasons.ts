import { ANALYSIS_CONFIG } from "./config";
import type { Evidence, Factor, FactorId, Reason } from "./types";

const MAX_REASONS = 4;
const NOTABLE_DISCOUNT = -0.05;
const STRONG_WIN_RATE = 0.6;
const STRONG_LONG_RUN = 0.07;

interface ReasonContext {
  drawdownFromHigh: number;
  evidence: Evidence;
  horizonYears: number;
  rsi: number | null;
  longRunAnnualReturn: number;
  longRunYears: number;
  factors: Factor[];
}

interface RankedReason extends Reason {
  /** Higher means it is shown first. */
  priority: number;
}

/**
 * Turns the factor results into the short list of reasons shown next to the
 * verdict. Only keys and numbers are produced; the wording lives in the
 * translation files.
 */
export function buildReasons(context: ReasonContext): Reason[] {
  const { drawdownFromHigh, evidence, horizonYears, rsi, factors } = context;
  const factor = (id: FactorId) => factors.find((f) => f.id === id);
  // How much a factor moved the score away from a neutral 50.
  const impact = (id: FactorId) => {
    const f = factor(id);
    return f ? Math.abs(f.score - 50) * f.weight : 0;
  };

  const reasons: RankedReason[] = [];

  // 1. Distance from the high: always shown, always first.
  if (drawdownFromHigh <= NOTABLE_DISCOUNT) {
    reasons.push({
      key: "discount",
      tone: "positive",
      values: { drawdown: -drawdownFromHigh },
      priority: 1000,
    });
  } else if (drawdownFromHigh >= ANALYSIS_CONFIG.band.nearHigh) {
    reasons.push({ key: "atHigh", tone: "negative", values: {}, priority: 1000 });
  } else {
    reasons.push({
      key: "smallDiscount",
      tone: "neutral",
      values: { drawdown: -drawdownFromHigh },
      priority: 1000,
    });
  }

  // 2. What history says about situations like this one.
  const similar = evidence.conditional;
  if (similar && evidence.weight > 0) {
    const strong = similar.winRate >= STRONG_WIN_RATE && similar.median > 0;
    const values = {
      winRate: similar.winRate,
      median: similar.median,
      years: horizonYears,
      episodes: evidence.episodes,
    };
    if (evidence.nearHigh) {
      reasons.push({
        key: "historyFromHighs",
        tone: strong ? "positive" : "negative",
        values,
        priority: 900,
      });
    } else {
      reasons.push({
        key: strong ? "historyStrong" : "historyWeak",
        tone: strong ? "positive" : "negative",
        values,
        priority: 900,
      });
    }
  } else {
    reasons.push({ key: "noComparable", tone: "neutral", values: {}, priority: 900 });
  }

  // 3. A negative long-run return caps the verdict, so it must be explained.
  if (context.longRunAnnualReturn < 0) {
    reasons.push({
      key: "longRunNegative",
      tone: "negative",
      values: { annualReturn: context.longRunAnnualReturn, years: context.longRunYears },
      priority: 800,
    });
  } else if (context.longRunAnnualReturn >= STRONG_LONG_RUN) {
    reasons.push({
      key: "longRunStrong",
      tone: "positive",
      values: { annualReturn: context.longRunAnnualReturn, years: context.longRunYears },
      priority: impact("longRun"),
    });
  }

  // 4. Trend.
  const trendScore = factor("trend")?.score ?? 50;
  if (trendScore >= 75) {
    reasons.push({ key: "trendUp", tone: "positive", values: {}, priority: impact("trend") });
  } else if (trendScore <= 25) {
    reasons.push({ key: "trendDown", tone: "negative", values: {}, priority: impact("trend") });
  } else {
    reasons.push({ key: "trendMixed", tone: "neutral", values: {}, priority: impact("trend") });
  }

  // 5. Momentum, only at the extremes.
  if (rsi !== null && rsi <= ANALYSIS_CONFIG.rsi.oversold) {
    reasons.push({
      key: "oversold",
      tone: "positive",
      values: { rsi },
      priority: impact("momentum"),
    });
  } else if (rsi !== null && rsi >= ANALYSIS_CONFIG.rsi.overbought) {
    reasons.push({
      key: "overbought",
      tone: "negative",
      values: { rsi },
      priority: impact("momentum"),
    });
  }

  return reasons
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_REASONS)
    .map(({ key, tone, values }) => ({ key, tone, values }));
}
