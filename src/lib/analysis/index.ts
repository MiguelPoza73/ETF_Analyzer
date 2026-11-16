import {
  ANALYSIS_CONFIG,
  HORIZONS,
  TRADING_DAYS_PER_MONTH,
  type HorizonYears,
} from "./config";
import { epochDayToISO, yearsBetween } from "./dates";
import { drawdownPercentile, drawdownSeries, highWaterMark, maxDrawdown } from "./drawdown";
import { buildEvidence } from "./forward-returns";
import { annualizedVolatility, lowerBound, rsi, smaAt } from "./indicators";
import { hashString, monthlyLogReturns } from "./projection";
import { buildReasons } from "./reasons";
import {
  confidenceFor,
  expectedReturn,
  labelFor,
  scoreDiscount,
  scoreEvidence,
  scoreLongRun,
  scoreMomentum,
  scoreTrend,
  totalScore,
} from "./score";
import { annualize, clamp } from "./stats";
import type { Analysis, Factor, HorizonAnalysis, PriceSeries, TrendState } from "./types";

export * from "./types";
export { ANALYSIS_CONFIG, HORIZONS, type HorizonYears } from "./config";

const MIN_POINTS = 60;
const DAYS_PER_YEAR = 365.25;

/** Annualised return between the first close on or after `fromDay` and the last close. */
function annualReturnSince(series: PriceSeries, fromDay: number): { value: number; years: number } {
  const { days, closes } = series;
  const last = closes.length - 1;
  const start = Math.min(lowerBound(days, fromDay), last);
  const years = yearsBetween(days[start], days[last]);
  const total = closes[last] / closes[start] - 1;
  // Annualising less than a year of data would exaggerate it.
  return { value: years >= 1 ? annualize(total, years) : total, years };
}

function trendState(closes: number[]): TrendState {
  const { shortSma, longSma, slopeLookback } = ANALYSIS_CONFIG.trend;
  const last = closes.length - 1;
  const sma50 = smaAt(closes, shortSma);
  const sma200 = smaAt(closes, longSma);
  const sma200Before = smaAt(closes, longSma, last - slopeLookback);
  const monthAgo = last - TRADING_DAYS_PER_MONTH;

  return {
    sma50,
    sma200,
    aboveSma200: sma200 === null ? null : closes[last] > sma200,
    sma50AboveSma200: sma50 === null || sma200 === null ? null : sma50 > sma200,
    sma200Rising: sma200 === null || sma200Before === null ? null : sma200 > sma200Before,
    return1m: monthAgo >= 0 ? closes[last] / closes[monthAgo] - 1 : null,
  };
}

/**
 * Runs the whole analysis on a price history.
 *
 * `seedKey` identifies the asset (its symbol) so that the simulator gives the
 * same result every time for the same asset and data.
 *
 * Returns null when there is too little data to say anything.
 */
export function analyze(series: PriceSeries, seedKey: string): Analysis | null {
  const { days, closes } = series;
  const n = closes.length;
  if (n < MIN_POINTS || days.length !== n) return null;

  const last = n - 1;
  const lastDay = days[last];
  const price = closes[last];
  const historyYears = yearsBetween(days[0], lastDay);

  const drawdowns = drawdownSeries(closes);
  const fromHigh = drawdowns[last];
  const high = highWaterMark(closes);
  const high52w = highWaterMark(closes, lowerBound(days, lastDay - 365));
  const percentile = drawdownPercentile(drawdowns, fromHigh);

  const trend = trendState(closes);
  const rsiValue = rsi(closes, ANALYSIS_CONFIG.rsi.period);

  const volatilityStart = lowerBound(
    days,
    lastDay - ANALYSIS_CONFIG.volatilityWindowYears * DAYS_PER_YEAR,
  );
  const longRun = annualReturnSince(
    series,
    lastDay - ANALYSIS_CONFIG.longRun.windowYears * DAYS_PER_YEAR,
  );
  const returnOver = (years: number) =>
    historyYears >= years
      ? annualReturnSince(series, lastDay - years * DAYS_PER_YEAR).value
      : null;

  const { weights, labels, minExtraYears, minHistoryMultiple } = ANALYSIS_CONFIG;
  const discountScore = scoreDiscount(fromHigh, percentile);
  const trendScore = scoreTrend(trend);
  const momentumScore = scoreMomentum(rsiValue);
  const longRunScore = scoreLongRun(longRun.value);

  const analyzeHorizon = (years: HorizonYears): HorizonAnalysis | null => {
    const requiredYears = Math.max(years + minExtraYears, years * minHistoryMultiple);
    if (historyYears < requiredYears) return null;
    const evidence = buildEvidence(series, drawdowns, years);
    if (!evidence) return null;

    const expected = expectedReturn(evidence, years, historyYears);
    const factors: Factor[] = [
      { id: "evidence", score: scoreEvidence(expected), weight: weights.evidence },
      { id: "discount", score: discountScore, weight: weights.discount },
      { id: "trend", score: trendScore, weight: weights.trend },
      { id: "momentum", score: momentumScore, weight: weights.momentum },
      { id: "longRun", score: longRunScore, weight: weights.longRun },
    ];

    let score = totalScore(factors);
    if (longRun.value < 0) score = Math.min(score, labels.negativeLongRunCap);
    score = Math.round(clamp(score, 0, 100));

    return {
      years,
      evidence,
      expected,
      factors,
      score,
      label: labelFor(score),
      confidence: confidenceFor(historyYears, evidence),
      reasons: buildReasons({
        drawdownFromHigh: fromHigh,
        evidence,
        horizonYears: years,
        rsi: rsiValue,
        longRunAnnualReturn: longRun.value,
        longRunYears: longRun.years,
        factors,
      }),
    };
  };

  const horizons = Object.fromEntries(
    HORIZONS.map((years) => [years, analyzeHorizon(years)]),
  ) as Record<HorizonYears, HorizonAnalysis | null>;

  const { projection, marketPriorAnnual, fullHistoryYears } = ANALYSIS_CONFIG;
  const monthly = monthlyLogReturns(series);
  const historyWeight = clamp(historyYears / fullHistoryYears, 0, 1);
  const simulation =
    monthly.length >= projection.minMonths
      ? {
          monthlyLogReturns: monthly,
          annualDrift: clamp(
            historyWeight * longRun.value + (1 - historyWeight) * marketPriorAnnual,
            projection.driftFloor,
            projection.driftCap,
          ),
          seed: (hashString(seedKey) ^ lastDay) >>> 0,
        }
      : null;

  return {
    asOf: epochDayToISO(lastDay),
    price,
    history: { years: historyYears, firstDate: epochDayToISO(days[0]), points: n },
    high: { value: high.value, date: epochDayToISO(days[high.index]), value52w: high52w.value },
    drawdown: {
      fromHigh,
      from52w: price / high52w.value - 1,
      percentile,
      max: maxDrawdown(drawdowns),
    },
    trend,
    rsi: rsiValue,
    volatility: annualizedVolatility(closes, volatilityStart),
    longRun: {
      annualReturn: longRun.value,
      years: longRun.years,
      return5y: returnOver(5),
      return10y: returnOver(10),
    },
    horizons,
    simulation,
  };
}
