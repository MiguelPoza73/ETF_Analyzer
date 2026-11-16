import type { Confidence, PriceSeries, VerdictLabel } from "@/lib/analysis/types";

export type AssetType = "ETF" | "EQUITY" | "MUTUALFUND" | "INDEX" | "OTHER";

export interface AssetInfo {
  symbol: string;
  name: string;
  type: AssetType;
  exchange: string;
  currency: string;
}

export interface AssetData {
  info: AssetInfo;
  series: PriceSeries;
}

export interface SearchHit {
  symbol: string;
  name: string;
  type: AssetType;
  exchange: string;
}

export type UniverseCategory =
  | "global"
  | "usa"
  | "europe"
  | "emerging"
  | "technology"
  | "sectors"
  | "factors";

/** One row of the opportunities ranking. */
export interface RankingItem {
  symbol: string;
  name: string;
  category: UniverseCategory;
  exchange: string;
  currency: string;
  price: number;
  /** ISO date of the last price. */
  asOf: string;
  score: number;
  label: VerdictLabel;
  confidence: Confidence;
  /** Distance from the all-time high (negative or zero). */
  drawdown: number;
  /** Expected total return at one year, with its pessimistic and optimistic bounds. */
  expected: number;
  low: number;
  high: number;
  /** Weekly closes of the last year, oldest first. */
  spark: number[];
}

export interface RankingSnapshot {
  /** ISO timestamp of when the snapshot was built. */
  generatedAt: string;
  items: RankingItem[];
}

/** The asset could not be found: wrong symbol or delisted. */
export class AssetNotFoundError extends Error {
  constructor(symbol: string) {
    super(`No data found for ${symbol}`);
    this.name = "AssetNotFoundError";
  }
}

/** The data provider failed or refused the request (network error, rate limit...). */
export class MarketDataUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "MarketDataUnavailableError";
  }
}
