import Link from "next/link";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const { t, locale } = await getI18n();
  return (
    <section className="mx-auto max-w-lg py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("notFound.title")}</h1>
      <p className="mt-2 text-ink-2">{t("notFound.body")}</p>
      <Link
        href={`/${locale}`}
        className="mt-6 inline-block rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        {t("notFound.back")}
      </Link>
    </section>
  );
}
