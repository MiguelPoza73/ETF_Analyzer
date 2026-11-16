import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  /** Short explanation shown under the title. */
  description?: ReactNode;
  /** Controls placed to the right of the title. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** The surface every block of a page sits on. */
export function Card({ title, description, action, children, className = "" }: CardProps) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** A labelled figure: sentence-case label, semibold value, optional note. */
export function StatTile({
  label,
  value,
  note,
  valueClassName = "text-ink",
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl bg-raised px-4 py-3">
      <p className="text-xs text-ink-3">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${valueClassName}`}>{value}</p>
      {note && <p className="mt-0.5 text-xs text-ink-3">{note}</p>}
    </div>
  );
}

/** Text colour for a signed figure: green up, red down, ink at zero. */
export function signClass(value: number): string {
  if (value > 0) return "text-up";
  if (value < 0) return "text-down";
  return "text-ink";
}
