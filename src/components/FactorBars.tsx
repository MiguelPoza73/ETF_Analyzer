"use client";

import { useI18n } from "@/i18n/client";
import type { Factor } from "@/lib/analysis/types";
import { Card } from "./Card";

/** The five factors behind the score: a name, a bar and a figure per row. */
export function FactorBars({ factors }: { factors: Factor[] }) {
  const { t, percent } = useI18n();

  return (
    <Card title={t("factors.title")} className="h-full">
      <ul className="space-y-5">
        {factors.map((factor) => {
          const name = t(`factors.names.${factor.id}`);
          const score = Math.round(factor.score);
          return (
            <li key={factor.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-ink">{name}</span>
                <span className="text-sm font-semibold tabular-nums text-ink">{score}</span>
              </div>
              <div
                role="meter"
                aria-label={t("factors.scoreLabel", { name, score })}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={score}
                className="mt-2 h-2 overflow-hidden rounded-full bg-accent-soft"
              >
                <div className="h-full rounded-full bg-accent" style={{ width: `${score}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-ink-3">
                {t(`factors.hints.${factor.id}`)} ·{" "}
                {t("factors.weight", { weight: percent(factor.weight, { digits: 0 }) })}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
