import { describe, expect, it } from "vitest";
import { ANALYSIS_CONFIG } from "../config";
import { drawdownSeries } from "../drawdown";
import { buildEvidence, conditionalBand } from "../forward-returns";
import { analyze } from "../index";
import {
  confidenceFor,
  expectedReturn,
  labelFor,
  scoreDiscount,
  scoreEvidence,
  scoreLongRun,
  scoreMomentum,
  scoreTrend,
} from "../score";
import { compound } from "../stats";
import type { Evidence, ReturnStats } from "../types";
import {
  dipSeries,
  growthSeries,
  POINTS_AT_BOTTOM,
  POINTS_AT_HIGH,
  seriesFrom,
} from "./fixtures";

const stats = (overrides: Partial<ReturnStats> = {}): ReturnStats => ({
  n: 1000,
  median: 0.08,
  mean: 0.08,
  winRate: 0.75,
  p10: -0.1,
  p90: 0.25,
  ...overrides,
});

const evidence = (overrides: Partial<Evidence> = {}): Evidence => ({
  band: [-0.25, -0.15],
  nearHigh: false,
  conditional: null,
  base: stats(),
  episodes: 0,
  weight: 0,
  recentEpisodes: [],
  ...overrides,
});

describe("conditional band", () => {
  it("uses a fixed band when the asset is at its highs", () => {
    expect(conditionalBand(-0.01)).toEqual({ band: [-0.03, 0], nearHigh: true });
    expect(conditionalBand(0)).toEqual({ band: [-0.03, 0], nearHigh: true });
  });

  it("widens with the depth of the fall", () => {
    const shallow = conditionalBand(-0.04);
    expect(shallow.nearHigh).toBe(false);
    expect(shallow.band[0]).toBeCloseTo(-0.07, 10);
    expect(shallow.band[1]).toBeCloseTo(-0.01, 10);

    const deep = conditionalBand(-0.2);
    expect(deep.band[0]).toBeCloseTo(-0.25, 10);
    expect(deep.band[1]).toBeCloseTo(-0.15, 10);
  });
});

describe("historical evidence", () => {
  const series = dipSeries(POINTS_AT_BOTTOM);
  const drawdowns = drawdownSeries(series.closes);

  it("counts one episode per past fall that has data for the whole horizon", () => {
    // Dips start every 500 sessions. The first is inside the warm-up and the
    // seventh is the current one, so at most five can count.
    expect(buildEvidence(series, drawdowns, 1)!.episodes).toBe(5);
    expect(buildEvidence(series, drawdowns, 3)!.episodes).toBe(4);
    expect(buildEvidence(series, drawdowns, 5)!.episodes).toBe(3);
  });

  it("finds that buying after a similar fall always paid off in this series", () => {
    const result = buildEvidence(series, drawdowns, 1)!;
    expect(result.nearHigh).toBe(false);
    expect(result.conditional).not.toBeNull();
    expect(result.conditional!.winRate).toBe(1);
    expect(result.conditional!.median).toBeGreaterThan(result.base.median);
    expect(result.weight).toBeCloseTo(5 / 9, 10);
    expect(result.recentEpisodes).toHaveLength(5);
    // Newest first.
    expect(result.recentEpisodes[0].date > result.recentEpisodes[1].date).toBe(true);
  });

  it("returns null when the history is shorter than the horizon", () => {
    const short = growthSeries(200, 0.08);
    expect(buildEvidence(short, drawdownSeries(short.closes), 1)).toBeNull();
  });
});

describe("expected return", () => {
  it("equals the market reference when the asset has no history of its own", () => {
    const result = expectedReturn(evidence(), 1, 0);
    expect(result.total).toBeCloseTo(ANALYSIS_CONFIG.marketPriorAnnual, 10);
    expect(result.capped).toBe(false);
  });

  it("equals the asset's own median with a long history and no similar episodes", () => {
    const result = expectedReturn(evidence(), 1, 30);
    expect(result.total).toBeCloseTo(0.08, 10);
    expect(result.low).toBeCloseTo(-0.1, 10);
    expect(result.high).toBeCloseTo(0.25, 10);
    expect(result.winRate).toBe(0.75);
  });

  it("moves towards what happened after similar situations as episodes accumulate", () => {
    const similar = stats({ median: 0.2, winRate: 0.9, p10: 0, p90: 0.4 });
    const result = expectedReturn(
      evidence({ conditional: similar, episodes: 4, weight: 0.5 }),
      1,
      30,
    );
    expect(result.total).toBeCloseTo(0.14, 10);
    expect(result.winRate).toBeCloseTo(0.825, 10);
    // Similar situations beat an ordinary day by 12 points, backed with weight 0.5.
    expect(result.edge).toBeCloseTo(0.06, 10);
  });

  it("has no edge without similar situations", () => {
    expect(expectedReturn(evidence(), 1, 30).edge).toBe(0);
  });

  it("limits the optimistic end of the range", () => {
    const wild = expectedReturn(evidence({ base: stats({ median: 0.1, p90: 3 }) }), 1, 30);
    expect(wild.total).toBeCloseTo(0.1, 10);
    expect(wild.high).toBeCloseTo(ANALYSIS_CONFIG.optimisticCapAnnual[1], 10);
    expect(wild.capped).toBe(true);
  });

  it("keeps the central estimate inside the range", () => {
    // Little history pulls the estimate towards the 7 % reference, above this p90.
    const result = expectedReturn(
      evidence({ base: stats({ median: -0.05, p10: -0.2, p90: 0.02 }) }),
      1,
      1,
    );
    expect(result.low).toBeLessThanOrEqual(result.total);
    expect(result.high).toBeGreaterThanOrEqual(result.total);
  });

  it("applies the prudence ceiling and floor", () => {
    const boom = expectedReturn(evidence({ base: stats({ median: 0.6 }) }), 1, 30);
    expect(boom.capped).toBe(true);
    expect(boom.total).toBeCloseTo(ANALYSIS_CONFIG.expectedCapAnnual[1], 10);

    const boom5y = expectedReturn(evidence({ base: stats({ median: 5 }) }), 5, 30);
    expect(boom5y.total).toBeCloseTo(compound(ANALYSIS_CONFIG.expectedCapAnnual[5], 5), 10);
    expect(boom5y.annualized).toBeCloseTo(ANALYSIS_CONFIG.expectedCapAnnual[5], 10);

    const bust = expectedReturn(evidence({ base: stats({ median: -0.5 }) }), 1, 30);
    expect(bust.total).toBeCloseTo(ANALYSIS_CONFIG.expectedFloorAnnual, 10);
    expect(bust.capped).toBe(false);
  });
});

describe("factor scores", () => {
  it("never scores a deeper discount lower", () => {
    let previous = -1;
    for (const drawdown of [0, -0.05, -0.1, -0.2, -0.3, -0.5]) {
      const score = scoreDiscount(drawdown, 0.5);
      expect(score).toBeGreaterThanOrEqual(previous);
      previous = score;
    }
    expect(scoreDiscount(0, 0)).toBe(0);
    expect(scoreDiscount(-0.3, 1)).toBe(100);
  });

  it("scores the evidence on win rate, expected return and edge", () => {
    const expected = (overrides: Partial<ReturnType<typeof expectedReturn>>) => ({
      total: 0.1,
      annualized: 0.1,
      low: -0.1,
      high: 0.3,
      winRate: 0.725,
      edge: 0,
      capped: false,
      ...overrides,
    });
    // Each part is exactly half-way along its range.
    expect(scoreEvidence(expected({}))).toBeCloseTo(50, 10);
    // A positive edge (good timing) raises the score; a negative one lowers it.
    expect(scoreEvidence(expected({ edge: 0.075 }))).toBeCloseTo(65, 10);
    expect(scoreEvidence(expected({ edge: -0.075 }))).toBeCloseTo(35, 10);
    expect(scoreEvidence(expected({ winRate: 0.95, annualized: 0.2, edge: 0.075 }))).toBe(100);
    expect(scoreEvidence(expected({ winRate: 0.4, annualized: -0.05, edge: -0.2 }))).toBe(0);
  });

  it("scores oversold high and overbought low", () => {
    expect(scoreMomentum(30)).toBe(100);
    expect(scoreMomentum(50)).toBe(50);
    expect(scoreMomentum(70)).toBe(0);
    expect(scoreMomentum(null)).toBe(50);
  });

  it("gives 25 points per trend check", () => {
    const base = { sma50: 1, sma200: 1 };
    expect(
      scoreTrend({
        ...base,
        aboveSma200: true,
        sma50AboveSma200: true,
        sma200Rising: true,
        return1m: 0.02,
      }),
    ).toBe(100);
    expect(
      scoreTrend({
        ...base,
        aboveSma200: false,
        sma50AboveSma200: false,
        sma200Rising: true,
        return1m: -0.02,
      }),
    ).toBe(25);
  });

  it("scores the long-run return between 0 % and 10 % a year", () => {
    expect(scoreLongRun(-0.02)).toBe(0);
    expect(scoreLongRun(0.05)).toBe(50);
    expect(scoreLongRun(0.2)).toBe(100);
  });

  it("maps scores to labels at the configured thresholds", () => {
    expect(labelFor(65)).toBe("buy");
    expect(labelFor(64)).toBe("neutral");
    expect(labelFor(45)).toBe("neutral");
    expect(labelFor(44)).toBe("wait");
  });

  it("rates confidence by years of data and number of episodes", () => {
    const withEpisodes = evidence({ conditional: stats(), episodes: 6, weight: 0.6 });
    expect(confidenceFor(20, withEpisodes)).toBe("high");
    expect(confidenceFor(10, withEpisodes)).toBe("medium");
    expect(confidenceFor(4, withEpisodes)).toBe("low");
    expect(confidenceFor(20, evidence())).toBe("low");
  });
});

describe("analyze", () => {
  it("returns null with too little data", () => {
    expect(analyze(growthSeries(30, 0.08), "X")).toBeNull();
    expect(analyze({ days: [1, 2], closes: [1] }, "X")).toBeNull();
  });

  it("is deterministic", () => {
    const series = dipSeries(POINTS_AT_BOTTOM);
    expect(analyze(series, "X")).toEqual(analyze(series, "X"));
  });

  it("only analyses the horizons the history can support", () => {
    // Roughly 4 years of data: enough for 1 year, not for 3 or 5.
    const fourYears = analyze(growthSeries(4 * 261, 0.08), "X")!;
    expect(fourYears.horizons[1]).not.toBeNull();
    expect(fourYears.horizons[3]).toBeNull();
    expect(fourYears.horizons[5]).toBeNull();

    // Roughly 7 years: 3 years needs 6, 5 years needs 10.
    const sevenYears = analyze(growthSeries(7 * 261, 0.08), "X")!;
    expect(sevenYears.horizons[3]).not.toBeNull();
    expect(sevenYears.horizons[5]).toBeNull();

    // Nearly 12 years: everything.
    const long = analyze(dipSeries(POINTS_AT_BOTTOM), "X")!;
    expect(long.horizons[5]).not.toBeNull();

    // Under 3 years: no verdict at all.
    const short = analyze(growthSeries(2 * 261, 0.08), "X")!;
    expect(short.horizons[1]).toBeNull();
  });

  it("describes an asset at the bottom of a familiar fall as a good buy", () => {
    const analysis = analyze(dipSeries(POINTS_AT_BOTTOM), "X")!;
    expect(analysis.drawdown.fromHigh).toBeLessThan(-0.15);
    expect(analysis.drawdown.fromHigh).toBeGreaterThan(-0.2);

    const oneYear = analysis.horizons[1]!;
    expect(oneYear.label).toBe("buy");
    expect(oneYear.expected.total).toBeGreaterThan(0.1);
    expect(oneYear.expected.low).toBeLessThanOrEqual(oneYear.expected.total);
    expect(oneYear.expected.high).toBeGreaterThanOrEqual(oneYear.expected.total);
    expect(oneYear.reasons[0].key).toBe("discount");
    expect(oneYear.reasons[0].values.drawdown).toBeCloseTo(-analysis.drawdown.fromHigh, 10);
    expect(oneYear.reasons.map((r) => r.key)).toContain("historyStrong");
    expect(oneYear.reasons.length).toBeLessThanOrEqual(4);
  });

  it("scores the same asset lower at its high than after a fall", () => {
    const atHigh = analyze(dipSeries(POINTS_AT_HIGH), "X")!;
    const atBottom = analyze(dipSeries(POINTS_AT_BOTTOM), "X")!;
    expect(atHigh.drawdown.fromHigh).toBe(0);

    const high = atHigh.horizons[1]!;
    const bottom = atBottom.horizons[1]!;
    expect(high.label).not.toBe("buy");
    expect(high.reasons[0].key).toBe("atHigh");
    expect(bottom.score).toBeGreaterThan(high.score);

    const discount = (h: typeof high) => h.factors.find((f) => f.id === "discount")!.score;
    expect(discount(bottom)).toBeGreaterThan(discount(high));
  });

  it("never recommends an asset whose long-run return is negative", () => {
    // Loses 10 % a year for 10 years.
    const analysis = analyze(growthSeries(10 * 261, -0.1), "X")!;
    const oneYear = analysis.horizons[1]!;
    expect(analysis.longRun.annualReturn).toBeLessThan(0);
    expect(oneYear.score).toBeLessThanOrEqual(ANALYSIS_CONFIG.labels.negativeLongRunCap);
    expect(oneYear.label).toBe("wait");
    expect(oneYear.reasons.map((r) => r.key)).toContain("longRunNegative");
  });

  it("keeps every factor score and the total between 0 and 100", () => {
    for (const series of [
      dipSeries(POINTS_AT_BOTTOM),
      dipSeries(POINTS_AT_HIGH),
      growthSeries(10 * 261, -0.1),
      growthSeries(10 * 261, 0.3),
    ]) {
      const horizon = analyze(series, "X")!.horizons[1]!;
      expect(horizon.score).toBeGreaterThanOrEqual(0);
      expect(horizon.score).toBeLessThanOrEqual(100);
      const weights = horizon.factors.reduce((sum, f) => sum + f.weight, 0);
      expect(weights).toBeCloseTo(1, 10);
      for (const factor of horizon.factors) {
        expect(factor.score).toBeGreaterThanOrEqual(0);
        expect(factor.score).toBeLessThanOrEqual(100);
      }
    }
  });

  it("reports basic facts about the price history", () => {
    const series = seriesFrom([
      ...Array.from({ length: 300 }, (_, i) => 100 + i),
      ...Array.from({ length: 100 }, (_, i) => 399 - 2 * (i + 1)),
    ]);
    const analysis = analyze(series, "X")!;
    expect(analysis.price).toBe(199);
    expect(analysis.high.value).toBe(399);
    expect(analysis.drawdown.fromHigh).toBeCloseTo(199 / 399 - 1, 10);
    expect(analysis.drawdown.max).toBeCloseTo(199 / 399 - 1, 10);
    expect(analysis.history.points).toBe(400);
    expect(analysis.trend.return1m).toBeCloseTo(199 / 241 - 1, 10);
  });
});
