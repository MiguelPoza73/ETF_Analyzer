import type { VerdictLabel } from "@/lib/analysis/types";

/**
 * Colours for code that cannot read CSS variables (the canvas price chart).
 * Keep in sync with the tokens in src/app/globals.css.
 */
export const COLORS = {
  surface: "#12161f",
  grid: "#222834",
  axis: "#323a4a",
  ink: "#eef1f6",
  inkMuted: "#8791a4",
  accent: "#3987e5",
  accentWash: "rgba(57, 135, 229, 0.16)",
  accentWashEnd: "rgba(57, 135, 229, 0)",
  deemphasis: "#6f7889",
} as const;

/** CSS variable carrying the status colour of each verdict. */
export const VERDICT_COLOR: Record<VerdictLabel, string> = {
  buy: "var(--color-good)",
  neutral: "var(--color-warning)",
  wait: "var(--color-critical)",
};
