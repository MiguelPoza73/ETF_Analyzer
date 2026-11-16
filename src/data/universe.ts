import type { UniverseCategory } from "@/lib/market-data/types";

export interface UniverseEntry {
  /** Yahoo Finance symbol. */
  symbol: string;
  category: UniverseCategory;
}

/**
 * Equity ETFs shown in the opportunities ranking: popular UCITS funds listed
 * in Europe plus the best-known US ones. The snapshot script checks every
 * symbol and leaves out any that Yahoo no longer serves.
 */
export const UNIVERSE: UniverseEntry[] = [
  // Global
  { symbol: "VWCE.DE", category: "global" },
  { symbol: "IWDA.AS", category: "global" },
  { symbol: "XDWD.DE", category: "global" },
  { symbol: "VT", category: "global" },
  { symbol: "ACWI", category: "global" },

  // United States
  { symbol: "SXR8.DE", category: "usa" },
  { symbol: "VUSA.AS", category: "usa" },
  { symbol: "SPY", category: "usa" },
  { symbol: "VOO", category: "usa" },
  { symbol: "VTI", category: "usa" },
  { symbol: "QQQ", category: "usa" },
  { symbol: "SXRV.DE", category: "usa" },
  { symbol: "IWM", category: "usa" },
  { symbol: "DIA", category: "usa" },

  // Europe
  { symbol: "EXSA.DE", category: "europe" },
  { symbol: "EZU", category: "europe" },
  { symbol: "SXRT.DE", category: "europe" },
  { symbol: "EXS1.DE", category: "europe" },
  { symbol: "VGK", category: "europe" },
  { symbol: "EWP", category: "europe" },

  // Emerging markets and Asia
  { symbol: "IS3N.DE", category: "emerging" },
  { symbol: "VWO", category: "emerging" },
  { symbol: "EEM", category: "emerging" },
  { symbol: "EWJ", category: "emerging" },
  { symbol: "INDA", category: "emerging" },
  { symbol: "MCHI", category: "emerging" },

  // Technology
  { symbol: "XLK", category: "technology" },
  { symbol: "QDVE.DE", category: "technology" },
  { symbol: "SMH", category: "technology" },
  { symbol: "SOXX", category: "technology" },
  { symbol: "ARKK", category: "technology" },

  // Other sectors
  { symbol: "XLV", category: "sectors" },
  { symbol: "XLF", category: "sectors" },
  { symbol: "XLE", category: "sectors" },
  { symbol: "ICLN", category: "sectors" },
  { symbol: "IQQH.DE", category: "sectors" },

  // Factors: dividends, small caps, quality
  { symbol: "VHYL.AS", category: "factors" },
  { symbol: "SCHD", category: "factors" },
  { symbol: "VIG", category: "factors" },
  { symbol: "IUSN.DE", category: "factors" },
  { symbol: "ZPRV.DE", category: "factors" },
  { symbol: "QUAL", category: "factors" },
];
