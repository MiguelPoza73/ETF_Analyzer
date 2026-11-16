import { describe, expect, it } from "vitest";
import { hashString, monthlyLogReturns, seededRandom, simulate } from "../projection";
import { growthSeries } from "./fixtures";

/** Ten years of monthly returns alternating +4 % and -2 %. */
const history = Array.from({ length: 120 }, (_, i) => (i % 2 === 0 ? 0.04 : -0.02));

describe("monthly returns", () => {
  it("turns steady daily growth into steady monthly returns", () => {
    const returns = monthlyLogReturns(growthSeries(3 * 261, 0.12));
    // Three years of data: the first month only sets the baseline and the last is dropped.
    expect(returns.length).toBeGreaterThanOrEqual(33);
    expect(returns.length).toBeLessThanOrEqual(35);
    const total = returns.reduce((sum, r) => sum + r, 0);
    expect(total / returns.length).toBeCloseTo(Math.log(1.12) / 12, 2);
  });

  it("keeps only the most recent years", () => {
    expect(monthlyLogReturns(growthSeries(10 * 261, 0.05), 2)).toHaveLength(24);
  });

  it("returns nothing for an empty series", () => {
    expect(monthlyLogReturns({ days: [], closes: [] })).toEqual([]);
  });
});

describe("seeded random", () => {
  it("repeats the same sequence for the same seed", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const c = seededRandom(43);
    const sequenceA = [a(), a(), a()];
    expect(sequenceA).toEqual([b(), b(), b()]);
    expect(sequenceA).not.toEqual([c(), c(), c()]);
    for (const value of sequenceA) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("hashes strings to stable, distinct numbers", () => {
    expect(hashString("VWCE.DE")).toBe(hashString("VWCE.DE"));
    expect(hashString("VWCE.DE")).not.toBe(hashString("IWDA.AS"));
  });
});

describe("simulate", () => {
  const input = {
    monthlyLogReturns: history,
    months: 60,
    initial: 1000,
    monthly: 100,
    annualDrift: 0.07,
    seed: 7,
  };

  it("gives the same projection for the same seed", () => {
    expect(simulate(input)).toEqual(simulate(input));
    expect(simulate(input)).not.toEqual(simulate({ ...input, seed: 8 }));
  });

  it("tracks the money paid in", () => {
    const result = simulate(input)!;
    expect(result.contributed).toHaveLength(61);
    expect(result.contributed[0]).toBe(1000);
    expect(result.contributed[60]).toBe(1000 + 60 * 100);
    expect(result.central[0]).toBe(1000);
  });

  it("orders the scenarios", () => {
    const result = simulate(input)!;
    for (let m = 1; m <= 60; m++) {
      expect(result.pessimistic[m]).toBeLessThanOrEqual(result.central[m]);
      expect(result.central[m]).toBeLessThanOrEqual(result.optimistic[m]);
    }
  });

  it("grows the central scenario at the drift, not at the historical average", () => {
    // The history averages about 1 % a month (12.7 % a year) but the drift is 7 %.
    const result = simulate({ ...input, monthly: 0, months: 120 })!;
    const expected = 1000 * 1.07 ** 10;
    expect(result.central[120]).toBeGreaterThan(expected * 0.95);
    expect(result.central[120]).toBeLessThan(expected * 1.05);
  });

  it("has no spread when the history has no volatility", () => {
    const flat = Array.from({ length: 36 }, () => 0.01);
    const result = simulate({ ...input, monthlyLogReturns: flat, monthly: 0, months: 12 })!;
    expect(result.pessimistic[12]).toBeCloseTo(1070, 6);
    expect(result.optimistic[12]).toBeCloseTo(1070, 6);
  });

  it("returns null with too little history", () => {
    expect(simulate({ ...input, monthlyLogReturns: history.slice(0, 12) })).toBeNull();
    expect(simulate({ ...input, months: 0 })).toBeNull();
  });
});
