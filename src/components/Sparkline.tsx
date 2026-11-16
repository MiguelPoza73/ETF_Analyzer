interface SparklineProps {
  values: number[];
  label: string;
  width?: number;
  height?: number;
}

const PADDING = 5;

/**
 * Small trend line: context in the de-emphasis grey, the latest value marked
 * with an accent dot ringed in the surface colour.
 */
export function Sparkline({ values, label, width = 112, height = 32 }: SparklineProps) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (index: number) => PADDING + (index / (values.length - 1)) * (width - 2 * PADDING);
  const y = (value: number) => height - PADDING - ((value - min) / span) * (height - 2 * PADDING);

  const path = values
    .map((value, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)} ${y(value).toFixed(1)}`)
    .join(" ");
  const last = values.length - 1;

  return (
    <svg
      role="img"
      aria-label={label}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <path
        d={path}
        fill="none"
        stroke="var(--color-deemph)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={x(last)}
        cy={y(values[last])}
        r={4}
        fill="var(--color-accent)"
        stroke="var(--color-surface)"
        strokeWidth={2}
      />
    </svg>
  );
}
