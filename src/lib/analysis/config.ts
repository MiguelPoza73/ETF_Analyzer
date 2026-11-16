/**
 * Every tunable constant of the analysis engine lives here.
 * The methodology page documents these values, so keep both in sync.
 */

export const TRADING_DAYS_PER_YEAR = 252;
export const TRADING_DAYS_PER_MONTH = 21;

export const HORIZONS = [1, 3, 5] as const;
export type HorizonYears = (typeof HORIZONS)[number];

export const ANALYSIS_CONFIG = {
  /**
   * A horizon of H years is only analysed with at least
   * max(H + minExtraYears, H * minHistoryMultiple) years of data.
   */
  minExtraYears: 2,
  minHistoryMultiple: 2,

  /** How "a similar distance from the high" is defined. */
  band: {
    /** Minimum half-width of the band, in drawdown points (0.03 = 3 pp). */
    minHalfWidth: 0.03,
    /** Half-width as a share of the current drawdown (deeper falls get wider bands). */
    relativeHalfWidth: 0.25,
    /** Above this drawdown the asset counts as "at its highs". */
    nearHigh: -0.03,
  },

  /**
   * First sessions of the history that are not used as comparable situations:
   * with so little past, the "high so far" is not meaningful yet.
   */
  warmupDays: 126,
  /** In-band days further apart than this (trading days) belong to different episodes. */
  episodeGapDays: 21,
  /** Fewer comparable days than this and the conditional evidence is ignored. */
  minConditionalObservations: 20,
  /** Weight of the conditional evidence = episodes / (episodes + this). */
  episodeShrinkage: 4,

  /** Long-run equity return used when an asset has little history of its own. */
  marketPriorAnnual: 0.07,
  /** Years of history needed before the asset's own record is fully trusted. */
  fullHistoryYears: 15,

  /** Annualised ceilings and floor for the expected return shown to the user. */
  expectedCapAnnual: { 1: 0.25, 3: 0.18, 5: 0.15 } as Record<HorizonYears, number>,
  expectedFloorAnnual: -0.1,
  /** Annualised ceiling for the optimistic end of the range. */
  optimisticCapAnnual: { 1: 0.6, 3: 0.35, 5: 0.3 } as Record<HorizonYears, number>,

  /** Factor weights of the 0-100 score. They add up to 1. */
  weights: {
    evidence: 0.35,
    discount: 0.3,
    trend: 0.15,
    momentum: 0.1,
    longRun: 0.1,
  },

  discount: {
    /** Drawdown at which the absolute half of the discount score reaches 100. */
    fullAt: 0.3,
  },

  evidence: {
    /** Win rate mapped linearly to 0..100 between these two values. */
    winRate: [0.5, 0.95] as const,
    /** Annualised expected return mapped linearly to 0..100 between these two values. */
    annualReturn: [0, 0.2] as const,
    /**
     * Edge mapped linearly to 0..100 between these two values. The edge is how
     * much better (annualised) similar situations turned out than an ordinary
     * day, so it measures timing rather than the quality of the asset.
     */
    edge: [-0.075, 0.075] as const,
    /** Share of each of the three parts in the evidence score. */
    parts: { winRate: 0.35, annualReturn: 0.35, edge: 0.3 },
  },

  trend: {
    shortSma: 50,
    longSma: 200,
    /** The long average is "rising" if it is above its value this many sessions ago. */
    slopeLookback: 63,
  },

  rsi: { period: 14, oversold: 30, overbought: 70 },

  longRun: {
    windowYears: 15,
    /** Annualised return at which the long-run factor reaches 100. */
    fullAt: 0.1,
  },

  labels: {
    /** Score from which the verdict is "good buy". */
    buy: 65,
    /** Score from which the verdict is "neutral"; below it, "wait". */
    neutral: 45,
    /** Ceiling applied when the long-run return is negative. */
    negativeLongRunCap: 44,
  },

  confidence: {
    highYears: 15,
    highEpisodes: 5,
    lowYears: 5,
  },

  volatilityWindowYears: 5,

  projection: {
    paths: 2000,
    /** Limits for the annual drift used by the long-term simulator. */
    driftCap: 0.15,
    driftFloor: -0.05,
    /** Monthly returns older than this are not resampled. */
    maxHistoryYears: 30,
    minMonths: 24,
  },
} as const;
