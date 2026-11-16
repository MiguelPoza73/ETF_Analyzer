import type { VerdictLabel } from "@/lib/analysis/types";
import { VERDICT_COLOR } from "@/lib/theme";
import { ArrowUpIcon, MinusIcon, PauseIcon } from "./icons";

const ICONS = { buy: ArrowUpIcon, neutral: MinusIcon, wait: PauseIcon } as const;

/**
 * Status marker for a verdict: a coloured disc with a distinct icon per
 * verdict, so the meaning never depends on colour alone.
 */
export function VerdictIcon({ label, size = 20 }: { label: VerdictLabel; size?: number }) {
  const Icon = ICONS[label];
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: VERDICT_COLOR[label],
        // Dark ink on the amber disc, white on green and red.
        color: label === "neutral" ? "#0b0b0b" : "#ffffff",
      }}
    >
      <Icon width={size * 0.6} height={size * 0.6} strokeWidth={2.25} />
    </span>
  );
}

/** Score, icon and verdict name on one line. The text stays in ink colour. */
export function VerdictBadge({
  label,
  score,
  text,
}: {
  label: VerdictLabel;
  score: number;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-7 text-right text-base font-semibold tabular-nums text-ink">{score}</span>
      <VerdictIcon label={label} size={18} />
      <span className="text-sm text-ink-2">{text}</span>
    </span>
  );
}
