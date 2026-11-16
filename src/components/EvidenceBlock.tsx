"use client";

import { useI18n } from "@/i18n/client";
import type { HorizonAnalysis, ReturnStats } from "@/lib/analysis/types";
import { Card, signClass, StatTile } from "./Card";

const MAX_EPISODES = 5;

interface RangeRowProps {
  name: string;
  stats: ReturnStats;
  color: string;
  /** Maps a return to a horizontal position, 0 to 100. */
  position: (value: number) => number;
}

/** One outcome range: a bar from the 10th to the 90th percentile with the median marked. */
function RangeRow({ name, stats, color, position }: RangeRowProps) {
  const { t, percent } = useI18n();
  const signed = (value: number) => percent(value, { digits: 0, signed: true });
  const left = position(stats.p10);
  const right = position(stats.p90);
  const description = t("evidence.rangeLabel", {
    name,
    low: signed(stats.p10),
    high: signed(stats.p90),
    median: signed(stats.median),
  });

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
        <span className="flex items-center gap-2 text-ink">
          <span aria-hidden className="h-2 w-4 rounded-full" style={{ backgroundColor: color }} />
          {name}
        </span>
        <span className="tabular-nums text-ink-2">
          {signed(stats.p10)} … {signed(stats.p90)}
        </span>
      </div>
      <div role="img" aria-label={description} title={description} className="relative mt-2 h-4">
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full"
          style={{ left: `${left}%`, width: `${Math.max(right - left, 1)}%`, backgroundColor: color }}
        />
        <div
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-ink"
          style={{ left: `${position(stats.median)}%` }}
        />
      </div>
    </div>
  );
}

/** What happened in the past after situations like today's, for the chosen horizon. */
export function EvidenceBlock({ horizon }: { horizon: HorizonAnalysis }) {
  const { t, percent, years, date } = useI18n();
  const { evidence } = horizon;
  const similar = evidence.conditional;
  const base = evidence.base;
  const shown = similar ?? base;
  const horizonText = years(horizon.years);
  const signed = (value: number, digits = 1) => percent(value, { digits, signed: true });

  const intro = !similar
    ? t("evidence.introNone", { horizon: horizonText })
    : evidence.nearHigh
      ? t("evidence.introHigh", {
          high: percent(-evidence.band[0], { digits: 0 }),
          horizon: horizonText,
        })
      : t("evidence.introSimilar", {
          low: percent(-evidence.band[1], { digits: 0 }),
          high: percent(-evidence.band[0], { digits: 0 }),
          horizon: horizonText,
        });

  // Both rows share one scale that always includes zero.
  const rows = similar ? [similar, base] : [base];
  const min = Math.min(0, ...rows.map((r) => r.p10));
  const max = Math.max(0, ...rows.map((r) => r.p90));
  const span = max - min || 1;
  const position = (value: number) => ((value - min) / span) * 100;
  const episodes = evidence.recentEpisodes.slice(0, MAX_EPISODES);

  return (
    <Card title={t("evidence.title")} description={intro} className="h-full">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label={t("evidence.wentUp")}
          value={percent(shown.winRate, { digits: 0 })}
          note={
            similar && t("evidence.versus", { value: percent(base.winRate, { digits: 0 }) })
          }
        />
        <StatTile
          label={t("evidence.median")}
          value={signed(shown.median)}
          valueClassName={signClass(shown.median)}
          note={similar && t("evidence.versus", { value: signed(base.median) })}
        />
        {similar && (
          <StatTile
            label={t("evidence.episodes")}
            value={evidence.episodes}
            note={t("evidence.episodesHint")}
          />
        )}
      </div>

      <div className="mt-6">
        <div className="relative space-y-4">
          {/* Zero reference shared by the rows. */}
          <div
            aria-hidden
            className="absolute bottom-0 top-0 w-px bg-axis"
            style={{ left: `${position(0)}%` }}
          />
          {similar && (
            <RangeRow
              name={t("evidence.similar")}
              stats={similar}
              color="var(--color-accent)"
              position={position}
            />
          )}
          <RangeRow
            name={t("evidence.anyDay")}
            stats={base}
            color="var(--color-deemph)"
            position={position}
          />
        </div>
        <div aria-hidden className="relative mt-1.5 h-4 text-xs tabular-nums text-ink-3">
          <span className="absolute -translate-x-1/2" style={{ left: `${position(0)}%` }}>
            {percent(0, { digits: 0 })}
          </span>
        </div>
        <p className="mt-2 text-xs text-ink-3">{t("evidence.rangeLegend")}</p>
      </div>

      {episodes.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-medium text-ink-2">{t("evidence.recent")}</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-3">
                <th scope="col" className="py-1.5 font-normal">
                  {t("evidence.date")}
                </th>
                <th scope="col" className="py-1.5 text-right font-normal">
                  {t("evidence.drawdown")}
                </th>
                <th scope="col" className="py-1.5 text-right font-normal">
                  {t("evidence.result", { horizon: horizonText })}
                </th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {episodes.map((episode) => (
                <tr key={episode.date} className="border-t border-line">
                  <td className="py-2 text-ink-2">{date(episode.date)}</td>
                  <td className="py-2 text-right text-ink-2">{signed(episode.drawdown)}</td>
                  <td className={`py-2 text-right font-medium ${signClass(episode.forwardReturn)}`}>
                    {signed(episode.forwardReturn)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
