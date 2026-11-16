/**
 * Drawdown of every day: distance from the highest close seen up to that day.
 * Values are zero at a new high and negative below it. No look-ahead.
 */
export function drawdownSeries(closes: ArrayLike<number>): Float64Array {
  const drawdowns = new Float64Array(closes.length);
  let peak = -Infinity;
  for (let i = 0; i < closes.length; i++) {
    if (closes[i] > peak) peak = closes[i];
    drawdowns[i] = closes[i] / peak - 1;
  }
  return drawdowns;
}

/** Highest close and the index of the first day it was reached. */
export function highWaterMark(
  closes: ArrayLike<number>,
  startIndex = 0,
): { value: number; index: number } {
  let value = -Infinity;
  let index = -1;
  for (let i = Math.max(startIndex, 0); i < closes.length; i++) {
    if (closes[i] > value) {
      value = closes[i];
      index = i;
    }
  }
  return { value, index };
}

/** Share of days whose drawdown was shallower than or equal to `current` (0..1). */
export function drawdownPercentile(drawdowns: ArrayLike<number>, current: number): number {
  if (drawdowns.length === 0) return NaN;
  let shallower = 0;
  for (let i = 0; i < drawdowns.length; i++) {
    if (drawdowns[i] >= current) shallower++;
  }
  return shallower / drawdowns.length;
}

/** Deepest drawdown of the series (negative or zero). */
export function maxDrawdown(drawdowns: ArrayLike<number>): number {
  let worst = 0;
  for (let i = 0; i < drawdowns.length; i++) {
    if (drawdowns[i] < worst) worst = drawdowns[i];
  }
  return worst;
}
