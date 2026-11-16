import { ANALYSIS_CONFIG, TRADING_DAYS_PER_YEAR, type HorizonYears } from "./config";
import { epochDayToISO } from "./dates";
import { summarizeReturns } from "./stats";
import type { Episode, Evidence, PriceSeries } from "./types";

const MAX_RECENT_EPISODES = 8;

/** Drawdown range treated as "a situation like today's". */
export function conditionalBand(currentDrawdown: number): {
  band: [number, number];
  nearHigh: boolean;
} {
  const { minHalfWidth, relativeHalfWidth, nearHigh } = ANALYSIS_CONFIG.band;
  if (currentDrawdown >= nearHigh) {
    return { band: [nearHigh, 0], nearHigh: true };
  }
  const halfWidth = Math.max(minHalfWidth, Math.abs(currentDrawdown) * relativeHalfWidth);
  return {
    band: [currentDrawdown - halfWidth, Math.min(currentDrawdown + halfWidth, 0)],
    nearHigh: false,
  };
}

/**
 * Looks at every past day and measures the return over the following
 * `horizonYears`, separating the days on which the asset was as far from its
 * high as it is today from all the others.
 *
 * Returns null when the history is shorter than the horizon.
 */
export function buildEvidence(
  series: PriceSeries,
  drawdowns: ArrayLike<number>,
  horizonYears: HorizonYears,
): Evidence | null {
  const { days, closes } = series;
  const horizonDays = horizonYears * TRADING_DAYS_PER_YEAR;
  const lastStart = closes.length - 1 - horizonDays;
  if (lastStart < 0) return null;

  const currentDrawdown = drawdowns[drawdowns.length - 1];
  const { band, nearHigh } = conditionalBand(currentDrawdown);
  const [bandLow, bandHigh] = band;
  const { warmupDays, episodeGapDays, minConditionalObservations, episodeShrinkage } =
    ANALYSIS_CONFIG;

  const allReturns: number[] = [];
  const similarReturns: number[] = [];
  const episodes: Episode[] = [];
  let lastSimilarIndex = -Infinity;

  for (let t = 0; t <= lastStart; t++) {
    const forwardReturn = closes[t + horizonDays] / closes[t] - 1;
    allReturns.push(forwardReturn);

    const drawdown = drawdowns[t];
    if (t >= warmupDays && drawdown >= bandLow && drawdown <= bandHigh) {
      similarReturns.push(forwardReturn);
      if (t - lastSimilarIndex > episodeGapDays) {
        episodes.push({ date: epochDayToISO(days[t]), drawdown, forwardReturn });
      }
      lastSimilarIndex = t;
    }
  }

  const base = summarizeReturns(allReturns);
  if (!base) return null;

  const usable = similarReturns.length >= minConditionalObservations;
  const conditional = usable ? summarizeReturns(similarReturns) : null;
  const weight = conditional ? episodes.length / (episodes.length + episodeShrinkage) : 0;

  return {
    band,
    nearHigh,
    conditional,
    base,
    episodes: conditional ? episodes.length : 0,
    weight,
    recentEpisodes: conditional ? episodes.slice(-MAX_RECENT_EPISODES).reverse() : [],
  };
}
