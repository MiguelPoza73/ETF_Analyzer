import { getI18n } from "@/i18n/server";
import type { Analysis } from "@/lib/analysis/types";
import { Card, signClass, StatTile } from "./Card";

/** Reference figures about the asset's history. */
export async function KeyStats({ analysis, currency }: { analysis: Analysis; currency: string }) {
  const { t, percent, price, number, date, years } = await getI18n();
  const signed = (value: number) => percent(value, { signed: true });
  const optionalReturn = (value: number | null) =>
    value === null ? (
      <span className="text-ink-3">{t("stats.notAvailable")}</span>
    ) : (
      <span className={signClass(value)}>{signed(value)}</span>
    );

  return (
    <Card title={t("stats.title")}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label={t("stats.high")}
          value={price(analysis.high.value, currency)}
          note={t("stats.on", { date: date(analysis.high.date) })}
        />
        <StatTile label={t("stats.from52w")} value={signed(analysis.drawdown.from52w)} />
        <StatTile label={t("stats.maxDrawdown")} value={signed(analysis.drawdown.max)} />
        <StatTile label={t("stats.volatility")} value={percent(analysis.volatility)} />
        <StatTile label={t("stats.return5y")} value={optionalReturn(analysis.longRun.return5y)} />
        <StatTile label={t("stats.return10y")} value={optionalReturn(analysis.longRun.return10y)} />
        <StatTile
          label={t("stats.rsi")}
          value={analysis.rsi === null ? t("stats.notAvailable") : number(analysis.rsi)}
        />
        <StatTile
          label={t("stats.history")}
          value={years(analysis.history.years)}
          note={t("stats.since", { date: date(analysis.history.firstDate) })}
        />
      </div>
    </Card>
  );
}
