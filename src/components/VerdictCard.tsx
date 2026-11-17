"use client";

import { useI18n } from "@/i18n/client";
import type { I18n } from "@/i18n/core";
import { HORIZONS, requiredHistoryYears, type HorizonYears } from "@/lib/analysis/config";
import { epochDayToISO } from "@/lib/analysis/dates";
import type { Analysis, HorizonAnalysis, Reason, ReasonTone } from "@/lib/analysis/types";
import { signClass, StatTile } from "./Card";
import { CheckIcon, CrossIcon, DotIcon, InfoIcon } from "./icons";
import { ScoreGauge } from "./ScoreGauge";
import { VerdictIcon } from "./VerdictBadge";

const TONE_ICON = { positive: CheckIcon, negative: CrossIcon, neutral: DotIcon } as const;
const TONE_CLASS: Record<ReasonTone, string> = {
  positive: "text-up",
  negative: "text-down",
  neutral: "text-ink-3",
};

/** Fills a reason's sentence with its numbers, formatted for the language. */
function reasonText(reason: Reason, { t, percent, number, years, span }: I18n): string {
  const values = reason.values;
  return t(`reasons.${reason.key}`, {
    drawdown: percent(values.drawdown ?? 0),
    winRate: percent(values.winRate ?? 0, { digits: 0 }),
    horizon: years(values.years ?? 1),
    // Measured period of the long-run return, e.g. 5.6 years.
    years: span(values.years ?? 1),
    rsi: number(values.rsi ?? 0),
    annualReturn: percent(values.annualReturn ?? 0, { signed: true }),
  });
}

interface HorizonTabsProps {
  analysis: Analysis;
  selected: HorizonYears;
  onSelect: (years: HorizonYears) => void;
}

/** Segmented control to choose the horizon of the estimate. */
function HorizonTabs({ analysis, selected, onSelect }: HorizonTabsProps) {
  const { t, years } = useI18n();
  return (
    <div
      role="group"
      aria-label={t("verdict.horizon")}
      className="flex rounded-lg border border-line p-0.5 text-xs font-medium"
    >
      {HORIZONS.map((option) => {
        const available = analysis.horizons[option] !== null;
        const current = option === selected;
        return (
          <button
            key={option}
            type="button"
            disabled={!available}
            aria-pressed={current}
            title={available ? undefined : t("verdict.notEnoughHistory")}
            onClick={() => onSelect(option)}
            className={`rounded-md px-2.5 py-1 transition-colors ${
              current
                ? "bg-raised text-ink"
                : available
                  ? "text-ink-3 hover:text-ink"
                  : "cursor-not-allowed text-ink-3/40"
            }`}
          >
            {years(option)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Shown instead of the verdict when no horizon can be analysed, usually
 * because the asset is too young. Says what is missing and when it will not be.
 */
export function NoVerdictCard({ analysis }: { analysis: Analysis }) {
  const { t, percent, span, date } = useI18n();
  const required = requiredHistoryYears(HORIZONS[0]);
  const { years: historyYears, firstDate } = analysis.history;
  const tooYoung = historyYears < required;
  const firstDay = Math.round(Date.parse(`${firstDate}T00:00:00Z`) / 86_400_000);
  const availableOn = epochDayToISO(Math.ceil(firstDay + required * 365.25));
  const fromHigh = analysis.drawdown.fromHigh;

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 gap-3">
          <InfoIcon width={20} height={20} className="mt-0.5 shrink-0 text-ink-3" />
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">{t("verdict.insufficientTitle")}</h2>
            <p className="mt-1.5 max-w-xl text-sm text-ink-2">
              {tooYoung
                ? t("verdict.insufficientBody", {
                    history: span(historyYears),
                    required: span(required),
                  })
                : t("verdict.insufficientGeneric")}
            </p>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-3 md:w-[22rem]">
          <StatTile
            label={t("verdict.insufficientFromHigh")}
            value={percent(fromHigh, { signed: true })}
            valueClassName={signClass(fromHigh)}
          />
          {tooYoung && (
            <StatTile
              label={t("verdict.insufficientAvailable")}
              value={<span className="text-base">{date(availableOn)}</span>}
              note={t("verdict.insufficientAvailableNote")}
            />
          )}
        </div>
      </div>
    </section>
  );
}

interface VerdictCardProps {
  analysis: Analysis;
  horizon: HorizonAnalysis;
  selected: HorizonYears;
  onSelect: (years: HorizonYears) => void;
}

/** The headline of an asset page: score, verdict, expected return and reasons. */
export function VerdictCard({ analysis, horizon, selected, onSelect }: VerdictCardProps) {
  const i18n = useI18n();
  const { t, percent, years } = i18n;

  const { expected, score, label, confidence, reasons } = horizon;
  const signed = (value: number, digits = 1) => percent(value, { digits, signed: true });

  return (
    <section className="h-full rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">{t("verdict.title")}</h2>
        <HorizonTabs analysis={analysis} selected={selected} onSelect={onSelect} />
      </div>

      <div className="flex items-center gap-5">
        <ScoreGauge
          score={score}
          label={label}
          description={t("verdict.scoreOutOf", { score })}
          outOf={t("verdict.outOf")}
        />
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            <VerdictIcon label={label} size={22} />
            {t(`verdict.labels.${label}`)}
          </p>
          <p
            className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink-3"
            title={t(`verdict.confidenceHints.${confidence}`)}
          >
            <InfoIcon width={14} height={14} />
            {t("verdict.confidence", { level: t(`verdict.confidenceLevels.${confidence}`) })}
          </p>
          <p className="mt-1 text-xs text-ink-3">{t(`verdict.confidenceHints.${confidence}`)}</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-raised px-4 py-3.5">
        <p className="text-xs text-ink-3">{t("verdict.expected", { horizon: years(selected) })}</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2.5">
          <span className={`text-3xl font-semibold tracking-tight ${signClass(expected.total)}`}>
            {signed(expected.total)}
          </span>
          {selected > 1 && (
            <span className="text-sm text-ink-2">
              {t("verdict.annualized", { value: signed(expected.annualized) })}
            </span>
          )}
        </p>
        <p className="mt-1.5 text-sm text-ink-2">
          {t("verdict.range", { low: signed(expected.low, 0), high: signed(expected.high, 0) })}
        </p>
        <p className="mt-0.5 text-sm text-ink-3">
          {t("verdict.probability", { value: percent(expected.winRate, { digits: 0 }) })}
        </p>
        {expected.capped && <p className="mt-2 text-xs text-ink-3">{t("verdict.capped")}</p>}
      </div>

      <h3 className="mb-2.5 mt-6 text-sm font-medium text-ink-2">{t("verdict.reasons")}</h3>
      <ul className="space-y-2.5">
        {reasons.map((reason) => {
          const Icon = TONE_ICON[reason.tone];
          return (
            <li key={reason.key} className="flex items-start gap-2.5 text-sm text-ink">
              <Icon
                className={`mt-0.5 shrink-0 ${TONE_CLASS[reason.tone]}`}
                strokeWidth={2.25}
              />
              <span>
                <span className="sr-only">{t(`verdict.${reason.tone}`)}: </span>
                {reasonText(reason, i18n)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
