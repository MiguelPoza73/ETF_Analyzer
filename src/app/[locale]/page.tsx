import Link from "next/link";
import { Ranking } from "@/components/Ranking";
import { SearchBox } from "@/components/SearchBox";
import { getI18n } from "@/i18n/server";
import { assetPath } from "@/lib/market-data/symbols";

const EXAMPLES = ["VWCE.DE", "IWDA.AS", "SPY", "QQQ", "NVDA"];

export default async function HomePage() {
  const { t, locale } = await getI18n();

  return (
    <>
      <section className="mx-auto max-w-2xl pb-14 pt-14 text-center sm:pb-16 sm:pt-20">
        <p className="text-sm font-medium text-accent">{t("home.eyebrow")}</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          {t("home.title")}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-lg text-ink-2">{t("home.subtitle")}</p>

        <div className="mt-8 text-left">
          <SearchBox />
        </div>

        <p className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-ink-3">
          {t("home.examples")}
          {EXAMPLES.map((symbol) => (
            <Link
              key={symbol}
              href={`/${locale}${assetPath(symbol)}`}
              className="rounded-full border border-line px-2.5 py-1 text-xs font-medium text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              {symbol}
            </Link>
          ))}
        </p>
      </section>

      <Ranking />
    </>
  );
}
