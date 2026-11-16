const SYMBOL_PATTERN = /^\^?[A-Z0-9][A-Z0-9.\-=]{0,19}$/;

/**
 * Normalises a symbol taken from a URL and rejects anything that does not
 * look like one, so arbitrary text never reaches the data provider.
 */
export function normalizeSymbol(raw: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const symbol = decoded.trim().toUpperCase();
  return SYMBOL_PATTERN.test(symbol) ? symbol : null;
}

/** Path of an asset page, without the locale prefix. */
export function assetPath(symbol: string): string {
  return `/asset/${encodeURIComponent(symbol)}`;
}
