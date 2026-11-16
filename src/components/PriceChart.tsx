"use client";

import {
  AreaSeries,
  ColorType,
  createChart,
  LineStyle,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/client";
import { formatLocale } from "@/i18n/config";
import { epochDayToISO } from "@/lib/analysis/dates";
import { lowerBound } from "@/lib/analysis/indicators";
import type { PriceSeries } from "@/lib/analysis/types";
import { COLORS } from "@/lib/theme";
import { Card, signClass } from "./Card";

const SECONDS_PER_DAY = 86_400;

const RANGES = [
  { id: "m1", days: 31 },
  { id: "m6", days: 183 },
  { id: "y1", days: 366 },
  { id: "y5", days: 1827 },
  { id: "max", days: null },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

interface PriceChartProps {
  series: PriceSeries;
  name: string;
  currency: string;
  high: { value: number; date: string };
}

const toTime = (day: number) => (day * SECONDS_PER_DAY) as UTCTimestamp;

/** Price history with a period selector and the all-time high marked. */
export function PriceChart({ series, name, currency, high }: PriceChartProps) {
  const i18n = useI18n();
  const { t, price, percent, date, number, locale } = i18n;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const readoutRef = useRef<HTMLParagraphElement>(null);

  const { days, closes } = series;
  const last = closes.length - 1;
  const lastDay = days[last];
  const historyDays = lastDay - days[0];

  // Only offer periods the history can fill.
  const ranges = RANGES.filter((r) => r.days === null || r.days <= historyDays);
  const [range, setRange] = useState<RangeId>(
    ranges.some((r) => r.id === "y5") ? "y5" : "max",
  );
  const rangeDays = RANGES.find((r) => r.id === range)?.days ?? null;
  const firstDay = rangeDays === null ? days[0] : lastDay - rangeDays;
  const firstIndex = Math.min(lowerBound(days, firstDay), last);
  const change = closes[last] / closes[firstIndex] - 1;

  const lastReadout = `${date(epochDayToISO(lastDay))} · ${price(closes[last], currency)}`;
  // Decimals for the price axis, chosen once from the size of the price.
  const axisDigits = closes[last] >= 1000 ? 0 : closes[last] >= 1 ? 2 : 4;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: COLORS.inkMuted,
        fontFamily: getComputedStyle(document.body).fontFamily,
        fontSize: 12,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: COLORS.grid },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: {
        vertLine: { color: COLORS.axis, labelBackgroundColor: COLORS.axis },
        horzLine: { color: COLORS.axis, labelBackgroundColor: COLORS.axis },
      },
      // The page must keep scrolling when the pointer is over the chart.
      handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: false, pinch: true, axisPressedMouseMove: false },
      localization: {
        locale: formatLocale[locale],
        priceFormatter: (value: number) => number(value, axisDigits),
      },
    });

    const area = chart.addSeries(AreaSeries, {
      lineColor: COLORS.accent,
      lineWidth: 2,
      topColor: COLORS.accentWash,
      bottomColor: COLORS.accentWashEnd,
      priceLineVisible: false,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: COLORS.surface,
      crosshairMarkerBorderWidth: 2,
    });
    area.setData(days.map((day, index) => ({ time: toTime(day), value: closes[index] })));
    area.createPriceLine({
      price: high.value,
      color: COLORS.deemphasis,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: t("chart.high"),
    });

    // Readout above the chart: the hovered day, or the last one when not hovering.
    chart.subscribeCrosshairMove((param) => {
      const readout = readoutRef.current;
      if (!readout) return;
      const point = param.seriesData.get(area);
      if (typeof param.time === "number" && point && "value" in point) {
        const iso = epochDayToISO(Math.round(param.time / SECONDS_PER_DAY));
        readout.textContent = `${date(iso)} · ${price(point.value, currency)}`;
      } else {
        readout.textContent = lastReadout;
      }
    });

    chartRef.current = chart;
    return () => {
      chartRef.current = null;
      chart.remove();
    };
    // `i18n` changes only with the language; the helpers taken from it are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, currency, high.value, axisDigits, i18n]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (rangeDays === null) {
      chart.timeScale().fitContent();
    } else {
      chart.timeScale().setVisibleRange({ from: toTime(firstDay), to: toTime(lastDay) });
    }
  }, [rangeDays, firstDay, lastDay, series, i18n]);

  return (
    <Card
      title={t("chart.title")}
      className="h-full"
      action={
        <div
          role="group"
          aria-label={t("chart.range")}
          className="flex rounded-lg border border-line p-0.5 text-xs font-medium"
        >
          {ranges.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={option.id === range}
              aria-label={t(`chart.rangeNames.${option.id}`)}
              onClick={() => setRange(option.id)}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                option.id === range ? "bg-raised text-ink" : "text-ink-3 hover:text-ink"
              }`}
            >
              {t(`chart.ranges.${option.id}`)}
            </button>
          ))}
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
        <p ref={readoutRef} className="tabular-nums text-ink-2">
          {lastReadout}
        </p>
        <p className={`tabular-nums ${signClass(change)}`}>
          {t("chart.change", { value: percent(change, { signed: true }) })}
        </p>
      </div>

      <figure>
        <div
          ref={containerRef}
          role="img"
          aria-label={t("chart.summary", {
            name,
            price: price(closes[last], currency),
            high: price(high.value, currency),
            date: date(high.date),
          })}
          className="h-[300px] w-full sm:h-[340px]"
        />
        <figcaption className="mt-3 text-xs text-ink-3">{t("chart.adjusted")}</figcaption>
      </figure>
    </Card>
  );
}
