import { describe, expect, it } from "vitest";
import {
  drawdownPercentile,
  drawdownSeries,
  highWaterMark,
  maxDrawdown,
} from "../drawdown";
import { annualizedVolatility, lowerBound, rsi, smaAt } from "../indicators";
import {
  annualize,
  compound,
  quantileSorted,
  scale,
  standardDeviation,
  summarizeReturns,
} from "../stats";

describe("stats", () => {
  it("interpolates quantiles", () => {
    const sorted = [1, 2, 3, 4, 5];
    expect(quantileSorted(sorted, 0)).toBe(1);
    expect(quantileSorted(sorted, 0.5)).toBe(3);
    expect(quantileSorted(sorted, 1)).toBe(5);
    expect(quantileSorted(sorted, 0.1)).toBeCloseTo(1.4, 10);
    expect(quantileSorted([], 0.5)).toBeNaN();
  });

  it("summarises a list of returns", () => {
    const stats = summarizeReturns([0.3, -0.1, 0.1, 0.2, -0.2]);
    expect(stats).not.toBeNull();
    expect(stats!.n).toBe(5);
    expect(stats!.median).toBeCloseTo(0.1, 10);
    expect(stats!.mean).toBeCloseTo(0.06, 10);
    expect(stats!.winRate).toBeCloseTo(0.6, 10);
    expect(stats!.p10).toBeCloseTo(-0.16, 10);
    expect(stats!.p90).toBeCloseTo(0.26, 10);
    expect(summarizeReturns([])).toBeNull();
  });

  it("annualises and compounds as inverse operations", () => {
    expect(compound(0.1, 2)).toBeCloseTo(0.21, 10);
    expect(annualize(0.21, 2)).toBeCloseTo(0.1, 10);
    expect(annualize(-1.5, 3)).toBe(-1);
  });

  it("scales a value onto 0-100 and clamps it", () => {
    expect(scale(0.5, 0, 1)).toBe(50);
    expect(scale(-1, 0, 1)).toBe(0);
    expect(scale(2, 0, 1)).toBe(100);
  });

  it("computes the sample standard deviation", () => {
    expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.13809, 4);
  });
});

describe("moving average", () => {
  it("averages the last values", () => {
    expect(smaAt([1, 2, 3, 4, 5], 3)).toBe(4);
    expect(smaAt([1, 2, 3, 4, 5], 3, 2)).toBe(2);
  });

  it("returns null without enough values", () => {
    expect(smaAt([1, 2], 3)).toBeNull();
    expect(smaAt([1, 2, 3], 3, 1)).toBeNull();
  });
});

describe("RSI", () => {
  it("is 100 when every session rises and 0 when every session falls", () => {
    const rising = Array.from({ length: 40 }, (_, i) => 100 + i);
    const falling = Array.from({ length: 40 }, (_, i) => 100 - i);
    expect(rsi(rising)).toBe(100);
    expect(rsi(falling)).toBe(0);
  });

  it("is 50 for a flat price", () => {
    expect(rsi(Array.from({ length: 40 }, () => 100))).toBe(50);
  });

  it("matches a hand-computed value with Wilder's smoothing", () => {
    // Period 2. First averages over the changes +1, +1: gain 1, loss 0.
    // Next change is -1: gain (1*1 + 0) / 2 = 0.5, loss (0*1 + 1) / 2 = 0.5 -> RSI 50.
    expect(rsi([1, 2, 3, 2], 2)).toBe(50);
    // One more change of -1: gain 0.25, loss 0.75 -> RS 1/3 -> RSI 25.
    expect(rsi([1, 2, 3, 2, 1], 2)).toBeCloseTo(25, 10);
  });

  it("returns null without enough values", () => {
    expect(rsi([1, 2, 3], 14)).toBeNull();
  });
});

describe("volatility", () => {
  it("is zero for perfectly steady growth", () => {
    const closes = Array.from({ length: 300 }, (_, i) => 100 * Math.exp(0.001 * i));
    expect(annualizedVolatility(closes)).toBeCloseTo(0, 8);
  });

  it("annualises the deviation of daily log returns", () => {
    // Log returns alternate +1 % and -1 %: sample deviation is just over 1 %.
    const closes = [100];
    for (let i = 0; i < 252; i++) {
      closes.push(closes[i] * Math.exp(i % 2 === 0 ? 0.01 : -0.01));
    }
    const expectedDaily = Math.sqrt((252 * 0.01 ** 2) / 251);
    expect(annualizedVolatility(closes)).toBeCloseTo(expectedDaily * Math.sqrt(252), 10);
  });
});

describe("lowerBound", () => {
  it("finds the first element not below the target", () => {
    expect(lowerBound([10, 20, 30], 20)).toBe(1);
    expect(lowerBound([10, 20, 30], 21)).toBe(2);
    expect(lowerBound([10, 20, 30], 5)).toBe(0);
    expect(lowerBound([10, 20, 30], 99)).toBe(3);
  });
});

describe("drawdown", () => {
  const closes = [100, 120, 90, 120, 150, 75];
  const drawdowns = drawdownSeries(closes);

  it("measures the distance from the highest close so far", () => {
    expect(Array.from(drawdowns)).toEqual([0, 0, -0.25, 0, 0, -0.5]);
  });

  it("finds the high, the worst fall and the percentile of a drawdown", () => {
    expect(highWaterMark(closes)).toEqual({ value: 150, index: 4 });
    expect(maxDrawdown(drawdowns)).toBe(-0.5);
    // Every day was at least as close to the high as -50 %.
    expect(drawdownPercentile(drawdowns, -0.5)).toBe(1);
    // Four of six days were at the high.
    expect(drawdownPercentile(drawdowns, 0)).toBeCloseTo(4 / 6, 10);
    // Five of six days were within 25 % of the high.
    expect(drawdownPercentile(drawdowns, -0.25)).toBeCloseTo(5 / 6, 10);
  });
});
