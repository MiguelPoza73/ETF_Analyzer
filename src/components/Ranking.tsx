import { getI18n } from "@/i18n/server";
import { loadRanking } from "@/lib/market-data/provider";
import { RankingTable } from "./RankingTable";

/** Opportunities ranking: popular equity ETFs sorted by score. */
export async function Ranking() {
  const { t, date } = await getI18n();
  const snapshot = await loadRanking();
  if (snapshot.items.length === 0) return null;

  // The newest price date among the ETFs, not the time the snapshot was built.
  const asOf = snapshot.items.reduce((latest, item) => (item.asOf > latest ? item.asOf : latest), "");

  return (
    <section aria-labelledby="ranking-title" className="pb-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h2 id="ranking-title" className="text-xl font-semibold tracking-tight text-ink">
            {t("ranking.title")}
          </h2>
          <p className="mt-1 text-sm text-ink-3">{t("ranking.subtitle")}</p>
        </div>
        <p className="text-xs text-ink-3">{t("ranking.updated", { date: date(asOf) })}</p>
      </div>
      <RankingTable items={snapshot.items} />
    </section>
  );
}
