import type { ReturnStats } from "./types";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Maps `value` linearly from [from, to] onto [0, 100], clamped at both ends. */
export function scale(value: number, from: number, to: number): number {
  if (to === from) return value >= to ? 100 : 0;
  return clamp(((value - from) / (to - from)) * 100, 0, 100);
}

/** Linear-interpolated quantile of an ascending array. */
export function quantileSorted(sorted: ArrayLike<number>, q: number): number {
  const n = sorted.length;
  if (n === 0) return NaN;
  const pos = (n - 1) * clamp(q, 0, 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function mean(values: ArrayLike<number>): number {
  if (values.length === 0) return NaN;
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i];
  return sum / values.length;
}

/** Sample standard deviation. */
export function standardDeviation(values: ArrayLike<number>): number {
  const n = values.length;
  if (n < 2) return NaN;
  const avg = mean(values);
  let sumSquares = 0;
  for (let i = 0; i < n; i++) {
    const diff = values[i] - avg;
    sumSquares += diff * diff;
  }
  return Math.sqrt(sumSquares / (n - 1));
}

export function summarizeReturns(returns: number[]): ReturnStats | null {
  const n = returns.length;
  if (n === 0) return null;
  const sorted = Float64Array.from(returns).sort();
  let wins = 0;
  for (let i = 0; i < n; i++) if (sorted[i] > 0) wins++;
  return {
    n,
    median: quantileSorted(sorted, 0.5),
    mean: mean(sorted),
    winRate: wins / n,
    p10: quantileSorted(sorted, 0.1),
    p90: quantileSorted(sorted, 0.9),
  };
}

/** Annualises a total return earned over `years`. */
export function annualize(totalReturn: number, years: number): number {
  if (years <= 0) return NaN;
  const growth = Math.max(1 + totalReturn, 0);
  return Math.pow(growth, 1 / years) - 1;
}

/** Compounds an annual return over `years`. */
export function compound(annualReturn: number, years: number): number {
  return Math.pow(1 + annualReturn, years) - 1;
}
