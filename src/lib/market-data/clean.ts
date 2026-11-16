import type { PriceSeries } from "@/lib/analysis/types";

export interface RawPoint {
  /** Days since the Unix epoch. */
  day: number;
  close: number;
}

/** A one-day move this large that fully reverts the next day is a data glitch. */
const GLITCH_RATIO = 1.5;
const PRICE_PRECISION = 7;

/**
 * Some exchanges quote in a hundredth of the currency (London in pence, for
 * example). Returns the main currency and the divisor that converts prices to it.
 */
export function normalizeCurrency(currency: string): { currency: string; divisor: number } {
  switch (currency) {
    case "GBp":
    case "GBX":
      return { currency: "GBP", divisor: 100 };
    case "ZAc":
    case "ZAC":
      return { currency: "ZAR", divisor: 100 };
    case "ILA":
      return { currency: "ILS", divisor: 100 };
    default:
      return { currency: currency || "USD", divisor: 1 };
  }
}

function isGlitch(previous: number, current: number, next: number): boolean {
  const up = current / previous > GLITCH_RATIO && current / next > GLITCH_RATIO;
  const down = previous / current > GLITCH_RATIO && next / current > GLITCH_RATIO;
  return up || down;
}

/**
 * Turns raw provider rows into a clean series: valid positive prices only,
 * ascending, one per day, without isolated one-day spikes.
 */
export function cleanSeries(points: RawPoint[]): PriceSeries {
  const valid = points
    .filter((p) => Number.isFinite(p.day) && Number.isFinite(p.close) && p.close > 0)
    .sort((a, b) => a.day - b.day);

  // Keep the last value reported for each day.
  const daily: RawPoint[] = [];
  for (const point of valid) {
    if (daily.length > 0 && daily[daily.length - 1].day === point.day) {
      daily[daily.length - 1] = point;
    } else {
      daily.push(point);
    }
  }

  const days: number[] = [];
  const closes: number[] = [];
  for (let i = 0; i < daily.length; i++) {
    const isInterior = i > 0 && i < daily.length - 1;
    if (isInterior && isGlitch(daily[i - 1].close, daily[i].close, daily[i + 1].close)) {
      continue;
    }
    days.push(daily[i].day);
    closes.push(Number(daily[i].close.toPrecision(PRICE_PRECISION)));
  }
  return { days, closes };
}
