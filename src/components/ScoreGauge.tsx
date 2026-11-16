import type { VerdictLabel } from "@/lib/analysis/types";
import { VERDICT_COLOR } from "@/lib/theme";

const SIZE = 136;
const STROKE = 11;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** The meter spans three quarters of the circle, open at the bottom. */
const ARC = 0.75;

interface ScoreGaugeProps {
  score: number;
  label: VerdictLabel;
  /** Accessible description, e.g. "Score 78 out of 100". */
  description: string;
  outOf: string;
}

/**
 * The score as a meter: the fill carries the verdict's status colour and the
 * track is the same colour, dimmed. The number itself stays in ink.
 */
export function ScoreGauge({ score, label, description, outOf }: ScoreGaugeProps) {
  const color = VERDICT_COLOR[label];
  const center = SIZE / 2;
  const track = CIRCUMFERENCE * ARC;
  const fill = track * Math.min(Math.max(score, 0), 100) * 0.01;

  return (
    <div
      role="img"
      aria-label={description}
      className="relative shrink-0"
      style={{ width: SIZE, height: SIZE }}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
        <g transform={`rotate(135 ${center} ${center})`} fill="none" strokeLinecap="round">
          <circle
            cx={center}
            cy={center}
            r={RADIUS}
            stroke={color}
            strokeOpacity={0.2}
            strokeWidth={STROKE}
            strokeDasharray={`${track} ${CIRCUMFERENCE}`}
          />
          {fill > 0 && (
            <circle
              cx={center}
              cy={center}
              r={RADIUS}
              stroke={color}
              strokeWidth={STROKE}
              strokeDasharray={`${fill} ${CIRCUMFERENCE}`}
            />
          )}
        </g>
      </svg>
      <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-semibold leading-none tracking-tight text-ink">{score}</span>
        <span className="mt-1 text-xs text-ink-3">{outOf}</span>
      </div>
    </div>
  );
}
