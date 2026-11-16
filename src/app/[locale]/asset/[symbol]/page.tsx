import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AnalysisView } from "@/components/AnalysisView";
import { signClass } from "@/components/Card";
import { KeyStats } from "@/components/KeyStats";
import { PriceChart } from "@/components/PriceChart";
import { SearchBox } from "@/components/SearchBox";
import { Simulator } from "@/components/Simulator";
import { getI18n } from "@/i18n/server";
import { loadAsset } from "@/lib/market-data/provider";
import { normalizeSymbol } from "@/lib/market-data/symbols";

type Props = PageProps<"/[locale]/asset/[symbol]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { symbol: raw } = await params;
  const symbol = normalizeSymbol(raw);
  if (!symbol) return {};
  const result = await loadAsset(symbol);
  return {
    title: result.status === "ok" ? `${result.info.name} (${result.info.symbol})` : symbol,
  };
}

/** Shown when the asset cannot be displayed: unknown symbol or data provider down. */
async function AssetMessage({ kind, symbol }: { kind: "notFound" | "unavailable"; symbol: string }) {
  const { t, locale } = await getI18n();
  return (
    <section className="mx-auto max-w-lg rounded-2xl border border-line bg-surface p-8 text-center">
      <h1 className="text-xl font-semibold text-ink">{t(`asset.${kind}Title`, { symbol })}</h1>
      <p className="mt-2 text-sm text-ink-2">{t(`asset.${kind}Body`, { symbol })}</p>
      <Link
        href={`/${locale}`}
        className="mt-6 inline-block rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        {t("asset.back")}
      </Link>
    </section>
  );
}

/** Placeholder with the shape of the page, shown while the data loads. */
async function AssetSkeleton() {
  const { t } = await getI18n();
  const block = "animate-pulse rounded-2xl border border-line bg-surface";
  return (
    <div role="status" aria-label={t("asset.loading")}>
      <div className="mb-6 h-16 max-w-md animate-pulse rounded-xl bg-surface" />
      <div className="grid gap-4 lg:grid-cols-5">
        <div className={`${block} h-[28rem] lg:col-span-2`} />
        <div className={`${block} h-[28rem] lg:col-span-3`} />
      </div>
      <p className="mt-4 text-sm text-ink-3">{t("asset.loading")}</p>
    </div>
  );
}

async function AssetContent({ params }: Pick<Props, "params">) {
  const { symbol: raw } = await params;
  const { t, price, percent, date } = await getI18n();

  const symbol = normalizeSymbol(raw);
  if (!symbol) return <AssetMessage kind="notFound" symbol={raw.slice(0, 20)} />;

  const result = await loadAsset(symbol);
  if (result.status === "not_found") return <AssetMessage kind="notFound" symbol={symbol} />;
  if (result.status === "unavailable") return <AssetMessage kind="unavailable" symbol={symbol} />;

  const { info, series, analysis, source } = result;
  const closes = series.closes;
  const dayChange = closes[closes.length - 1] / closes[closes.length - 2] - 1;

  return (
    <div className="space-y-4">
      {source === "snapshot" && (
        <p
          role="status"
          className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink-2"
        >
          {t("asset.snapshot")}
        </p>
      )}

      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pb-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
            <span className="rounded-md border border-line px-1.5 py-0.5 font-medium text-ink-2">
              {info.symbol}
            </span>
            <span>{t(`assetType.${info.type}`)}</span>
            {info.exchange && <span>· {info.exchange}</span>}
          </p>
          <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {info.name}
          </h1>
        </div>
        <div className="sm:text-right">
          <p className="text-3xl font-semibold tracking-tight text-ink">
            {price(analysis.price, info.currency)}
          </p>
          <p className="mt-1 text-sm text-ink-3">
            <span className={signClass(dayChange)}>
              {t("asset.today", { value: percent(dayChange, { digits: 2, signed: true }) })}
            </span>
            {" · "}
            {t("asset.asOf", { date: date(analysis.asOf) })}
          </p>
        </div>
      </header>

      <AnalysisView
        analysis={analysis}
        chart={
          <PriceChart
            series={series}
            name={info.name}
            currency={info.currency}
            high={analysis.high}
          />
        }
      />
      <Simulator simulation={analysis.simulation} currency={info.currency} />
      <KeyStats analysis={analysis} currency={info.currency} />
    </div>
  );
}

export default function AssetPage({ params }: Props) {
  return (
    <div className="py-6 sm:py-8">
      <div className="mb-6 max-w-md">
        <SearchBox size="md" />
      </div>
      {/* The symbol is only known at request time, so the content streams in. */}
      <Suspense fallback={<AssetSkeleton />}>
        <AssetContent params={params} />
      </Suspense>
    </div>
  );
}
