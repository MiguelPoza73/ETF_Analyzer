import type { PriceSeries } from "../types";

/** 2000-01-03, a Monday, as days since the Unix epoch. */
const START_DAY = 10959;

/** Builds a series on consecutive weekdays (no weekends), like real trading days. */
export function seriesFrom(closes: number[], startDay = START_DAY): PriceSeries {
  const days: number[] = [];
  let day = startDay;
  while (days.length < closes.length) {
    const weekday = (day + 4) % 7; // 0 = Sunday, 6 = Saturday
    if (weekday !== 0 && weekday !== 6) days.push(day);
    day++;
  }
  return { days, closes };
}

/** Weekdays per year, used to turn an annual growth rate into a daily one. */
const WEEKDAYS_PER_YEAR = 261;

/** Smooth growth at `annualGrowth` per year. */
export function growthSeries(points: number, annualGrowth: number): PriceSeries {
  const daily = Math.log(1 + annualGrowth) / WEEKDAYS_PER_YEAR;
  return seriesFrom(Array.from({ length: points }, (_, t) => 100 * Math.exp(daily * t)));
}

export const DIP = { every: 500, length: 120, depth: 0.2 } as const;

/**
 * Growth of 8 % a year interrupted every `DIP.every` sessions by a V-shaped
 * fall of `DIP.depth` that lasts `DIP.length` sessions and fully recovers.
 */
export function dipSeries(points: number): PriceSeries {
  const daily = Math.log(1.08) / WEEKDAYS_PER_YEAR;
  const closes = Array.from({ length: points }, (_, t) => {
    const phase = t % DIP.every;
    const shape = phase < DIP.length ? 1 - Math.abs((2 * phase) / DIP.length - 1) : 0;
    return 100 * Math.exp(daily * t) * (1 - DIP.depth * shape);
  });
  return seriesFrom(closes);
}

/** Six full cycles and then the bottom of a seventh dip: the asset is ~19 % below its high. */
export const POINTS_AT_BOTTOM = 6 * DIP.every + DIP.length / 2 + 1;
/** Six full cycles, ending just before the next dip starts: the asset is at its high. */
export const POINTS_AT_HIGH = 6 * DIP.every;
