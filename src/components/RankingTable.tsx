"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { assetPath } from "@/lib/market-data/symbols";
import type { RankingItem, UniverseCategory } from "@/lib/market-data/types";
import { signClass } from "./Card";
import { Sparkline } from "./Sparkline";
import { VerdictBadge } from "./VerdictBadge";

const CATEGORIES: UniverseCategory[] = [
  "global",
  "usa",
  "europe",
  "emerging",
  "technology",
  "sectors",
  "factors",
];

const COLUMNS = "md:grid-cols-[minmax(0,1fr)_11.5rem_6.5rem_10.5rem_7rem]";

/** The opportunities ranking with its category filter. */
export function RankingTable({ items }: { items: RankingItem[] }) {
  const { t, percent, locale } = useI18n();
  const [category, setCategory] = useState<UniverseCategory | "all">("all");

  const present = CATEGORIES.filter((c) => items.some((item) => item.category === c));
  const visible = category === "all" ? items : items.filter((item) => item.category === category);

  return (
    <div>
      <div role="group" aria-label={t("ranking.filter")} className="mb-4 flex flex-wrap gap-2">
        {(["all", ...present] as const).map((option) => {
          const selected = option === category;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => setCategory(option)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                selected
                  ? "border-accent bg-accent-soft text-ink"
                  : "border-line text-ink-2 hover:border-line-strong hover:text-ink"
              }`}
            >
              {t(`ranking.categories.${option}`)}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div
          aria-hidden
          className={`hidden gap-x-4 border-b border-line px-5 py-3 text-xs text-ink-3 md:grid ${COLUMNS}`}
        >
          <span>{t("ranking.columns.asset")}</span>
          <span>{t("ranking.columns.score")}</span>
          <span className="text-right">{t("ranking.columns.drawdown")}</span>
          <span className="text-right">{t("ranking.columns.expected")}</span>
          <span className="text-right">{t("ranking.columns.trend")}</span>
        </div>

        <ul className="divide-y divide-line">
          {visible.map((item) => {
            const expected = percent(item.expected, { signed: true });
            const drawdown = percent(item.drawdown, { signed: true });
            const range = t("ranking.range", {
              low: percent(item.low, { digits: 0, signed: true }),
              high: percent(item.high, { digits: 0, signed: true }),
            });
            return (
              <li key={item.symbol}>
                <Link
                  href={`/${locale}${assetPath(item.symbol)}`}
                  className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-raised sm:px-5 ${COLUMNS}`}
                >
                  <span className="min-w-0">
                    {/* Two lines on narrow screens, one truncated line on wide ones. */}
                    <span className="line-clamp-2 text-sm font-medium text-ink md:line-clamp-1">
                      {item.name}
                    </span>
                    <span className="block truncate text-xs text-ink-3">
                      {item.symbol} · {item.exchange}
                    </span>
                  </span>

                  <VerdictBadge
                    label={item.label}
                    score={item.score}
                    text={t(`verdict.labels.${item.label}`)}
                  />

                  {/* Narrow screens: the two figures share a second line, each with its label. */}
                  <span className="col-span-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-3 md:hidden">
                    <span>
                      {t("ranking.columns.drawdown")}{" "}
                      <span className="font-medium tabular-nums text-ink-2">{drawdown}</span>
                    </span>
                    <span>
                      {t("ranking.columns.expected")}{" "}
                      <span className={`font-medium tabular-nums ${signClass(item.expected)}`}>
                        {expected}
                      </span>
                    </span>
                  </span>

                  <span className="hidden text-right text-sm tabular-nums text-ink-2 md:block">
                    <span className="sr-only">{t("ranking.columns.drawdown")}: </span>
                    {drawdown}
                  </span>

                  <span className="hidden text-right md:block">
                    <span className="sr-only">{t("ranking.columns.expected")}: </span>
                    <span
                      className={`block text-sm font-medium tabular-nums ${signClass(item.expected)}`}
                    >
                      {expected}
                    </span>
                    <span className="block text-xs tabular-nums text-ink-3">{range}</span>
                  </span>

                  <span className="hidden justify-end md:flex">
                    <Sparkline values={item.spark} label={t("ranking.sparkline")} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
