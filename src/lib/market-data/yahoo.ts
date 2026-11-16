import YahooFinance from "yahoo-finance2";
import { cleanSeries, normalizeCurrency, type RawPoint } from "./clean";
import {
  AssetNotFoundError,
  MarketDataUnavailableError,
  type AssetData,
  type AssetType,
  type SearchHit,
} from "./types";

/**
 * Yahoo Finance client. It only works on a server: Yahoo does not allow
 * browsers to call it. This file has no framework dependencies so the
 * snapshot script can use it too.
 */
const yahoo = new YahooFinance({ suppressNotices: ["yahooSurvey"], versionCheck: false });

const HISTORY_START = "1985-01-01";
const SECONDS_PER_DAY = 86_400;
/** Share of rows that must carry an adjusted close for it to be used. */
const ADJUSTED_COVERAGE = 0.95;
const SEARCHABLE_TYPES: ReadonlySet<string> = new Set(["ETF", "EQUITY", "MUTUALFUND", "INDEX"]);

type Loose = Record<string, unknown>;

function isRecord(value: unknown): value is Loose {
  return typeof value === "object" && value !== null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function assetType(value: unknown): AssetType {
  return typeof value === "string" && SEARCHABLE_TYPES.has(value) ? (value as AssetType) : "OTHER";
}

function isNotFound(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /no data found|not found|delisted/i.test(message);
}

function isValidationError(error: unknown): boolean {
  return error instanceof Error && error.name === "FailedYahooValidationError";
}

function forcedFailure(): boolean {
  return process.env.MARKET_DATA_FORCE_FAIL === "1";
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs a Yahoo request, retrying failures that may be temporary. If Yahoo
 * changed its response format and the library rejects it, the raw response
 * is used instead: everything is parsed defensively below anyway.
 */
async function request<T>(
  run: (validate: boolean) => Promise<T>,
  retries: number,
): Promise<T | unknown> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await wait(700 * 2 ** (attempt - 1));
    try {
      return await run(true);
    } catch (error) {
      if (isNotFound(error)) throw error;
      if (isValidationError(error)) {
        try {
          return await run(false);
        } catch (rawError) {
          lastError = rawError;
          continue;
        }
      }
      lastError = error;
    }
  }
  throw lastError;
}

function parseChart(raw: unknown, symbol: string): AssetData {
  if (!isRecord(raw) || !isRecord(raw.meta) || !Array.isArray(raw.quotes)) {
    throw new MarketDataUnavailableError(`Unexpected chart response for ${symbol}`);
  }
  const meta = raw.meta;
  const quotes = raw.quotes.filter(isRecord);
  const { currency, divisor } = normalizeCurrency(text(meta.currency) ?? "");
  // Bars are stamped at the market open in UTC; the offset gives the local trading date.
  const gmtOffset = typeof meta.gmtoffset === "number" ? meta.gmtoffset : 0;

  const adjusted = quotes.filter((q) => typeof q.adjclose === "number").length;
  const field = adjusted >= quotes.length * ADJUSTED_COVERAGE ? "adjclose" : "close";

  const points: RawPoint[] = [];
  for (const quote of quotes) {
    const date = quote.date instanceof Date ? quote.date : new Date(quote.date as string | number);
    const close = quote[field];
    if (typeof close !== "number" || Number.isNaN(date.getTime())) continue;
    points.push({
      day: Math.floor((date.getTime() / 1000 + gmtOffset) / SECONDS_PER_DAY),
      close: close / divisor,
    });
  }

  const series = cleanSeries(points);
  if (series.closes.length === 0) throw new AssetNotFoundError(symbol);

  return {
    info: {
      symbol: text(meta.symbol) ?? symbol,
      name: text(meta.longName) ?? text(meta.shortName) ?? symbol,
      type: assetType(meta.instrumentType),
      exchange: text(meta.fullExchangeName) ?? text(meta.exchangeName) ?? "",
      currency,
    },
    series,
  };
}

/**
 * Full daily price history of an asset.
 *
 * @throws AssetNotFoundError when Yahoo does not know the symbol.
 * @throws MarketDataUnavailableError when Yahoo fails or refuses the request.
 */
export async function fetchYahooAsset(symbol: string, retries = 1): Promise<AssetData> {
  if (forcedFailure()) throw new MarketDataUnavailableError("Forced failure (testing)");
  try {
    const raw = await request(
      (validate) =>
        yahoo.chart(
          symbol,
          { period1: HISTORY_START, interval: "1d" },
          { validateResult: validate } as { validateResult: true },
        ),
      retries,
    );
    return parseChart(raw, symbol);
  } catch (error) {
    if (error instanceof AssetNotFoundError || error instanceof MarketDataUnavailableError) {
      throw error;
    }
    if (isNotFound(error)) throw new AssetNotFoundError(symbol);
    throw new MarketDataUnavailableError(`Yahoo request failed for ${symbol}`, { cause: error });
  }
}

/**
 * Searches Yahoo by name, ticker or ISIN. Results keep Yahoo's relevance order.
 *
 * @throws MarketDataUnavailableError when Yahoo fails or refuses the request.
 */
export async function searchYahoo(query: string, limit = 8): Promise<SearchHit[]> {
  if (forcedFailure()) throw new MarketDataUnavailableError("Forced failure (testing)");
  let raw: unknown;
  try {
    raw = await request(
      (validate) =>
        yahoo.search(
          query,
          { quotesCount: limit + 4, newsCount: 0, enableFuzzyQuery: false },
          { validateResult: validate } as { validateResult: true },
        ),
      1,
    );
  } catch (error) {
    throw new MarketDataUnavailableError(`Yahoo search failed for "${query}"`, { cause: error });
  }

  const quotes = isRecord(raw) && Array.isArray(raw.quotes) ? raw.quotes.filter(isRecord) : [];
  const hits: SearchHit[] = [];
  const seen = new Set<string>();
  for (const quote of quotes) {
    const symbol = text(quote.symbol);
    const type = assetType(quote.quoteType);
    if (!symbol || type === "OTHER" || quote.isYahooFinance !== true || seen.has(symbol)) continue;
    seen.add(symbol);
    hits.push({
      symbol,
      name: text(quote.longname) ?? text(quote.shortname) ?? symbol,
      type,
      exchange: text(quote.exchDisp) ?? text(quote.exchange) ?? "",
    });
    if (hits.length === limit) break;
  }
  return hits;
}
