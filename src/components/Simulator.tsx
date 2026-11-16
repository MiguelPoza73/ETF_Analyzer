"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useI18n } from "@/i18n/client";
import { ANALYSIS_CONFIG } from "@/lib/analysis/config";
import { simulate } from "@/lib/analysis/projection";
import type { Analysis } from "@/lib/analysis/types";
import { Card, signClass, StatTile } from "./Card";

const MAX_YEARS = 20;
const MAX_AMOUNT = 10_000_000;

interface Row {
  month: number;
  pessimistic: number;
  central: number;
  optimistic: number;
  contributed: number;
  /** Pessimistic to optimistic, drawn as a band. */
  range: [number, number];
}

/** Reads an amount typed by the user: empty or invalid counts as zero. */
function parseAmount(text: string): number {
  const value = Number(text);
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), MAX_AMOUNT) : 0;
}

/** Short line or block used to key a series in the legend and the tooltip. */
function SeriesKey({ color, band = false }: { color: string; band?: boolean }) {
  return (
    <span
      aria-hidden
      className={band ? "h-2.5 w-4 rounded-sm" : "h-0.5 w-4 rounded-full"}
      style={{ backgroundColor: color, opacity: band ? 0.3 : 1 }}
    />
  );
}

interface SimulatorProps {
  simulation: Analysis["simulation"];
  currency: string;
}

/** Projects a lump sum plus monthly contributions in three scenarios. */
export function Simulator({ simulation, currency }: SimulatorProps) {
  const { t, money, percent, number, compact, years: yearsText } = useI18n();
  const id = useId();
  const [initialText, setInitialText] = useState("1000");
  const [monthlyText, setMonthlyText] = useState("100");
  const [years, setYears] = useState(10);

  // Typing and dragging stay responsive while the projection catches up.
  const initial = useDeferredValue(parseAmount(initialText));
  const monthly = useDeferredValue(parseAmount(monthlyText));
  const horizonYears = useDeferredValue(years);
  const months = horizonYears * 12;

  const rows = useMemo<Row[] | null>(() => {
    if (!simulation) return null;
    const result = simulate({
      monthlyLogReturns: simulation.monthlyLogReturns,
      annualDrift: simulation.annualDrift,
      seed: simulation.seed,
      months,
      initial,
      monthly,
    });
    if (!result) return null;
    return result.central.map((central, month) => ({
      month,
      central,
      pessimistic: result.pessimistic[month],
      optimistic: result.optimistic[month],
      contributed: result.contributed[month],
      range: [result.pessimistic[month], result.optimistic[month]],
    }));
  }, [simulation, months, initial, monthly]);

  if (!simulation || !rows) {
    return (
      <Card title={t("simulator.title")}>
        <p className="text-sm text-ink-2">{t("simulator.unavailable")}</p>
      </Card>
    );
  }

  const final = rows[rows.length - 1];
  const gain = final.contributed > 0 ? final.central / final.contributed - 1 : 0;
  const horizonText = yearsText(horizonYears);
  const tickStep = horizonYears <= 10 ? 12 : 24;
  const ticks = Array.from({ length: Math.floor(months / tickStep) + 1 }, (_, i) => i * tickStep);
  const yearRows = rows.filter((row) => row.month % 12 === 0);

  const inputClass =
    "w-full rounded-xl border border-line-strong bg-raised px-3.5 py-2.5 text-base tabular-nums text-ink outline-none transition-colors focus:border-accent";

  return (
    <Card title={t("simulator.title")} description={t("simulator.subtitle")}>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={`${id}-initial`} className="mb-1.5 block text-xs text-ink-3">
            {t("simulator.initial")} ({currency})
          </label>
          <input
            id={`${id}-initial`}
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_AMOUNT}
            step={100}
            value={initialText}
            onChange={(event) => setInitialText(event.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`${id}-monthly`} className="mb-1.5 block text-xs text-ink-3">
            {t("simulator.monthly")} ({currency})
          </label>
          <input
            id={`${id}-monthly`}
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_AMOUNT}
            step={50}
            value={monthlyText}
            onChange={(event) => setMonthlyText(event.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${id}-years`}
            className="mb-1.5 flex items-baseline justify-between text-xs text-ink-3"
          >
            {t("simulator.years")}
            <span className="text-sm font-medium tabular-nums text-ink">{yearsText(years)}</span>
          </label>
          <input
            id={`${id}-years`}
            type="range"
            min={1}
            max={MAX_YEARS}
            step={1}
            value={years}
            onChange={(event) => setYears(Number(event.target.value))}
            className="mt-2.5 w-full"
          />
        </div>
      </div>

      <p className="mb-3 mt-6 text-sm text-ink-2">
        {t("simulator.finalValue", { horizon: horizonText })}
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={t("simulator.pessimistic")} value={money(final.pessimistic, currency)} />
        <StatTile
          label={t("simulator.central")}
          value={money(final.central, currency)}
          note={
            <span className={signClass(gain)}>
              {t("simulator.gain", { value: percent(gain, { digits: 0, signed: true }) })}
            </span>
          }
        />
        <StatTile label={t("simulator.optimistic")} value={money(final.optimistic, currency)} />
        <StatTile label={t("simulator.contributed")} value={money(final.contributed, currency)} />
      </div>

      <figure className="mt-6">
        <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-2">
          <li className="flex items-center gap-2">
            <SeriesKey color="var(--color-accent)" />
            {t("simulator.central")}
          </li>
          <li className="flex items-center gap-2">
            <SeriesKey color="var(--color-accent)" band />
            {t("simulator.rangeLegend")}
          </li>
          <li className="flex items-center gap-2">
            <SeriesKey color="var(--color-deemph)" />
            {t("simulator.contributed")}
          </li>
        </ul>

        <div
          role="img"
          aria-label={t("simulator.chartSummary", {
            horizon: horizonText,
            central: money(final.central, currency),
            pessimistic: money(final.pessimistic, currency),
            optimistic: money(final.optimistic, currency),
            contributed: money(final.contributed, currency),
          })}
          className="h-[300px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--color-grid)" />
              <XAxis
                dataKey="month"
                type="number"
                domain={[0, months]}
                ticks={ticks}
                tickFormatter={(month: number) =>
                  month === 0 ? t("simulator.today") : String(month / 12)
                }
                tickLine={false}
                axisLine={{ stroke: "var(--color-axis)" }}
                tick={{ fill: "var(--color-ink-3)", fontSize: 12 }}
              />
              <YAxis
                width={56}
                tickFormatter={(value: number) => compact(value)}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--color-ink-3)", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ stroke: "var(--color-axis)" }}
                isAnimationActive={false}
                content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as Row | undefined;
                  if (!active || !row) return null;
                  const entries = [
                    { label: t("simulator.optimistic"), value: row.optimistic, color: "var(--color-accent)", band: true },
                    { label: t("simulator.central"), value: row.central, color: "var(--color-accent)", band: false },
                    { label: t("simulator.pessimistic"), value: row.pessimistic, color: "var(--color-accent)", band: true },
                    { label: t("simulator.contributed"), value: row.contributed, color: "var(--color-deemph)", band: false },
                  ];
                  return (
                    <div className="rounded-xl border border-line-strong bg-raised px-3.5 py-3 text-xs shadow-xl shadow-black/40">
                      <p className="mb-2 text-ink-3">
                        {row.month === 0
                          ? t("simulator.today")
                          : `${t("simulator.year")} ${number(row.month / 12, row.month % 12 === 0 ? 0 : 1)}`}
                      </p>
                      <ul className="space-y-1.5">
                        {entries.map((entry) => (
                          <li key={entry.label} className="flex items-center gap-2">
                            <SeriesKey color={entry.color} band={entry.band} />
                            <span className="font-semibold tabular-nums text-ink">
                              {money(entry.value, currency)}
                            </span>
                            <span className="text-ink-3">{entry.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                }}
              />
              <Area
                dataKey="range"
                stroke="none"
                fill="var(--color-accent)"
                fillOpacity={0.12}
                activeDot={false}
                isAnimationActive={false}
              />
              <Line
                dataKey="contributed"
                stroke="var(--color-deemph)"
                strokeWidth={2}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
              <Line
                dataKey="central"
                stroke="var(--color-accent)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: "var(--color-surface)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-right text-xs text-ink-3">{t("simulator.axisYears")}</p>

        <figcaption className="mt-3 text-xs text-ink-3">
          {t("simulator.note", {
            paths: number(ANALYSIS_CONFIG.projection.paths),
            drift: percent(simulation.annualDrift, { signed: true }),
          })}
        </figcaption>
      </figure>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-ink-2 hover:text-ink">{t("simulator.table")}</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm tabular-nums">
            <thead>
              <tr className="text-right text-xs text-ink-3">
                <th scope="col" className="py-1.5 text-left font-normal">
                  {t("simulator.year")}
                </th>
                <th scope="col" className="py-1.5 font-normal">
                  {t("simulator.contributed")}
                </th>
                <th scope="col" className="py-1.5 font-normal">
                  {t("simulator.pessimistic")}
                </th>
                <th scope="col" className="py-1.5 font-normal">
                  {t("simulator.central")}
                </th>
                <th scope="col" className="py-1.5 font-normal">
                  {t("simulator.optimistic")}
                </th>
              </tr>
            </thead>
            <tbody>
              {yearRows.map((row) => (
                <tr key={row.month} className="border-t border-line text-right text-ink-2">
                  <th scope="row" className="py-2 text-left font-normal">
                    {row.month === 0 ? t("simulator.today") : row.month / 12}
                  </th>
                  <td className="py-2">{money(row.contributed, currency)}</td>
                  <td className="py-2">{money(row.pessimistic, currency)}</td>
                  <td className="py-2 font-medium text-ink">{money(row.central, currency)}</td>
                  <td className="py-2">{money(row.optimistic, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}
