import { formatLocale, type Locale } from "./config";
import { en } from "./messages/en";
import { es, type Messages } from "./messages/es";

const dictionaries: Record<Locale, Messages> = { es, en };

/** Every dotted path to a string in the messages, e.g. "verdict.labels.buy". */
type Leaves<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;
export type MessageParams = Record<string, string | number>;

interface PercentOptions {
  /** Decimal places. Defaults to 1. */
  digits?: number;
  /** Show a plus sign on positive values. */
  signed?: boolean;
}

function lookup(messages: Messages, key: string): string {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return key;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : key;
}

/**
 * Translation and formatting helpers for one language. Pure and shared by
 * server and client code.
 */
export function createI18n(locale: Locale) {
  const messages = dictionaries[locale];
  const tag = formatLocale[locale];

  const t = (key: MessageKey, params?: MessageParams): string => {
    const template = lookup(messages, key);
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );
  };

  const percent = (value: number, { digits = 1, signed = false }: PercentOptions = {}) =>
    new Intl.NumberFormat(tag, {
      style: "percent",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      signDisplay: signed ? "exceptZero" : "auto",
    }).format(value);

  const number = (value: number, digits = 0) =>
    new Intl.NumberFormat(tag, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);

  /** A price with its currency, with more decimals for small prices. */
  const price = (value: number, currency: string) => {
    const digits = Math.abs(value) >= 1000 ? 0 : Math.abs(value) >= 1 ? 2 : 4;
    try {
      return new Intl.NumberFormat(tag, {
        style: "currency",
        currency,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value);
    } catch {
      // Unknown currency code.
      return `${number(value, digits)} ${currency}`;
    }
  };

  /** A whole amount of money, without decimals. */
  const money = (value: number, currency: string) => {
    try {
      return new Intl.NumberFormat(tag, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return `${number(value)} ${currency}`;
    }
  };

  /** Short form for axis ticks: 12.5K, 1.2M. */
  const compact = (value: number) =>
    new Intl.NumberFormat(tag, { notation: "compact", maximumFractionDigits: 1 }).format(value);

  /** "12 mar 2020" from an ISO date (YYYY-MM-DD). */
  const date = (iso: string) =>
    new Intl.DateTimeFormat(tag, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

  /** "1 año" / "3 años". */
  const years = (count: number) => {
    const rounded = Math.round(count);
    return t(rounded === 1 ? "units.year" : "units.years", { count: rounded });
  };

  return { locale, t, percent, number, compact, price, money, date, years };
}

export type I18n = ReturnType<typeof createI18n>;
