import { TRADING_DAYS_PER_YEAR } from "./config";
import { standardDeviation } from "./stats";

/** Simple moving average of the `period` values ending at `endIndex` (inclusive). */
export function smaAt(
  values: ArrayLike<number>,
  period: number,
  endIndex: number = values.length - 1,
): number | null {
  if (period <= 0 || endIndex < period - 1 || endIndex >= values.length) return null;
  let sum = 0;
  for (let i = endIndex - period + 1; i <= endIndex; i++) sum += values[i];
  return sum / period;
}

/**
 * Relative Strength Index at the last value, with Wilder's smoothing.
 * Returns null when there are fewer than `period + 1` values.
 */
export function rsi(values: ArrayLike<number>, period = 14): number | null {
  const n = values.length;
  if (period <= 0 || n < period + 1) return null;

  // Wilder's average converges quickly; 20 periods of warm-up are plenty.
  const start = Math.max(0, n - (period * 20 + 1));
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = start + 1; i <= start + period; i++) {
    const change = values[i] - values[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = start + period + 1; i < n; i++) {
    const change = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period;
  }

  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

/** Daily log returns of `closes` from `startIndex` to the end. */
export function logReturns(closes: ArrayLike<number>, startIndex = 0): number[] {
  const returns: number[] = [];
  for (let i = Math.max(startIndex, 0) + 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }
  return returns;
}

/** Annualised volatility of daily log returns from `startIndex` to the end. */
export function annualizedVolatility(closes: ArrayLike<number>, startIndex = 0): number {
  const returns = logReturns(closes, startIndex);
  if (returns.length < 2) return NaN;
  return standardDeviation(returns) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

/** Index of the first element of the ascending array `values` that is >= `target`. */
export function lowerBound(values: ArrayLike<number>, target: number): number {
  let lo = 0;
  let hi = values.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (values[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
