import type { HorizonYears } from "./config";

/**
 * Daily price history. `days` are days since the Unix epoch (UTC) in ascending
 * order and `closes` the adjusted close of each of those days.
 */
export interface PriceSeries {
  days: number[];
  closes: number[];
}

export interface ReturnStats {
  /** Number of daily observations. */
  n: number;
  median: number;
  mean: number;
  /** Share of observations with a positive return (0..1). */
  winRate: number;
  p10: number;
  p90: number;
}

export interface Episode {
  /** ISO date of the first day of the episode. */
  date: string;
  /** Drawdown from the high on that day (negative). */
  drawdown: number;
  /** Return over the horizon measured from that day. */
  forwardReturn: number;
}

export interface Evidence {
  /** Drawdown range that counts as "similar to today". */
  band: [number, number];
  /** True when today's price is at or near its high. */
  nearHigh: boolean;
  /** What happened after similar situations. Null when there are too few. */
  conditional: ReturnStats | null;
  /** What happened after any day in the asset's history. */
  base: ReturnStats;
  /** Number of distinct past episodes behind `conditional`. */
  episodes: number;
  /** Weight (0..1) given to `conditional` when blending with `base`. */
  weight: number;
  /** Most recent episodes, newest first. */
  recentEpisodes: Episode[];
}

export interface ExpectedReturn {
  /** Total return over the horizon. */
  total: number;
  annualized: number;
  /** Pessimistic (10th percentile) and optimistic (90th percentile) total returns. */
  low: number;
  high: number;
  /** Probability of ending above today's price (0..1). */
  winRate: number;
  /**
   * How much better (annualised) similar situations turned out than an
   * ordinary day, weighted by how many episodes back it up. Zero without them.
   */
  edge: number;
  /** True when the estimate or its optimistic end hit a prudence ceiling. */
  capped: boolean;
}

export type FactorId = "evidence" | "discount" | "trend" | "momentum" | "longRun";

export interface Factor {
  id: FactorId;
  /** 0..100 */
  score: number;
  /** 0..1 */
  weight: number;
}

export type VerdictLabel = "buy" | "neutral" | "wait";
export type Confidence = "high" | "medium" | "low";
export type ReasonTone = "positive" | "negative" | "neutral";

export type ReasonKey =
  | "discount"
  | "smallDiscount"
  | "atHigh"
  | "historyStrong"
  | "historyWeak"
  | "historyFromHighs"
  | "noComparable"
  | "trendUp"
  | "trendDown"
  | "trendMixed"
  | "oversold"
  | "overbought"
  | "longRunStrong"
  | "longRunNegative";

export interface Reason {
  key: ReasonKey;
  tone: ReasonTone;
  /** Raw numbers the UI formats and interpolates into the sentence. */
  values: Record<string, number>;
}

export interface HorizonAnalysis {
  years: HorizonYears;
  evidence: Evidence;
  expected: ExpectedReturn;
  factors: Factor[];
  /** 0..100, rounded. */
  score: number;
  label: VerdictLabel;
  confidence: Confidence;
  reasons: Reason[];
}

export interface TrendState {
  sma50: number | null;
  sma200: number | null;
  aboveSma200: boolean | null;
  sma50AboveSma200: boolean | null;
  sma200Rising: boolean | null;
  return1m: number | null;
}

export interface Analysis {
  /** ISO date of the last price. */
  asOf: string;
  price: number;
  history: {
    years: number;
    firstDate: string;
    points: number;
  };
  high: {
    value: number;
    date: string;
    /** Highest close of the last 52 weeks. */
    value52w: number;
  };
  drawdown: {
    /** Distance from the all-time high (negative or zero). */
    fromHigh: number;
    from52w: number;
    /** Share of past days on which the asset was closer to its high than today. */
    percentile: number;
    /** Deepest fall from a high in the whole history. */
    max: number;
  };
  trend: TrendState;
  rsi: number | null;
  /** Annualised volatility of daily returns. */
  volatility: number;
  longRun: {
    /** Annualised return over the long-run window. */
    annualReturn: number;
    years: number;
    return5y: number | null;
    return10y: number | null;
  };
  /** One entry per horizon; null when the history is too short for it. */
  horizons: Record<HorizonYears, HorizonAnalysis | null>;
  /** Inputs for the client-side investment simulator. Null with too little history. */
  simulation: {
    monthlyLogReturns: number[];
    annualDrift: number;
    seed: number;
  } | null;
}
