import { ANALYSIS_CONFIG } from "./config";
import { monthIndex } from "./dates";
import { mean, quantileSorted } from "./stats";
import type { PriceSeries } from "./types";

/**
 * Log returns between consecutive month-end closes. The last month of the
 * series is left out because it is usually incomplete.
 */
export function monthlyLogReturns(
  series: PriceSeries,
  maxYears: number = ANALYSIS_CONFIG.projection.maxHistoryYears,
): number[] {
  const { days, closes } = series;
  if (closes.length === 0) return [];

  const monthEndCloses: number[] = [];
  let currentMonth = monthIndex(days[0]);
  for (let i = 1; i < closes.length; i++) {
    const month = monthIndex(days[i]);
    if (month !== currentMonth) {
      monthEndCloses.push(closes[i - 1]);
      currentMonth = month;
    }
  }

  const returns: number[] = [];
  for (let i = 1; i < monthEndCloses.length; i++) {
    returns.push(Math.log(monthEndCloses[i] / monthEndCloses[i - 1]));
  }
  return returns.slice(-maxYears * 12);
}

/** Small, fast, seedable pseudo-random generator (mulberry32). Returns values in [0, 1). */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic 32-bit hash of a string (FNV-1a), used to derive seeds. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface SimulationInput {
  /** Historical monthly log returns to resample from. */
  monthlyLogReturns: number[];
  months: number;
  /** Amount invested today. */
  initial: number;
  /** Amount added at the start of every month. */
  monthly: number;
  /** Annual return of the central scenario. */
  annualDrift: number;
  seed: number;
  paths?: number;
}

export interface SimulationResult {
  /** Portfolio value per month (index 0 is today) in each scenario. */
  pessimistic: number[];
  central: number[];
  optimistic: number[];
  /** Money paid in up to each month. */
  contributed: number[];
}

/**
 * Projects an investment by resampling the asset's own monthly returns
 * (bootstrap). The historical average is replaced by `annualDrift`, so the
 * simulation keeps the asset's volatility but not its past growth rate.
 *
 * Returns null when there is too little history to resample from.
 */
export function simulate(input: SimulationInput): SimulationResult | null {
  const { monthlyLogReturns: history, months, initial, monthly, annualDrift, seed } = input;
  const paths = input.paths ?? ANALYSIS_CONFIG.projection.paths;
  if (history.length < ANALYSIS_CONFIG.projection.minMonths || months < 1 || paths < 1) {
    return null;
  }

  const monthlyDrift = Math.log(1 + annualDrift) / 12;
  const historicalMean = mean(history);
  const shocks = history.map((r) => r - historicalMean + monthlyDrift);

  const random = seededRandom(seed);
  // values[m * paths + p] = value of path p at the end of month m + 1.
  const values = new Float64Array(months * paths);
  for (let p = 0; p < paths; p++) {
    let value = initial;
    for (let m = 0; m < months; m++) {
      const shock = shocks[Math.floor(random() * shocks.length)];
      value = (value + monthly) * Math.exp(shock);
      values[m * paths + p] = value;
    }
  }

  const pessimistic = [initial];
  const central = [initial];
  const optimistic = [initial];
  const contributed = [initial];
  for (let m = 0; m < months; m++) {
    const monthValues = values.slice(m * paths, (m + 1) * paths).sort();
    pessimistic.push(quantileSorted(monthValues, 0.1));
    central.push(quantileSorted(monthValues, 0.5));
    optimistic.push(quantileSorted(monthValues, 0.9));
    contributed.push(initial + monthly * (m + 1));
  }

  return { pessimistic, central, optimistic, contributed };
}
