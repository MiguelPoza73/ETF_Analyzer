import Link from "next/link";
import { Suspense } from "react";
import { getI18n } from "@/i18n/server";
import { LogoMark } from "./icons";
import { LocaleSwitch } from "./LocaleSwitch";

export async function Header() {
  const { t, locale } = await getI18n();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2.5 rounded-md text-[15px] font-semibold tracking-tight text-ink"
        >
          <LogoMark />
          ETF Analyzer
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href={`/${locale}/methodology`}
            className="rounded-md px-2 py-1 text-sm text-ink-2 transition-colors hover:text-ink"
          >
            {t("nav.methodology")}
          </Link>
          {/* The switch reads the URL, which is unknown while prerendering dynamic pages. */}
          <Suspense fallback={<div className="h-[30px] w-[74px]" />}>
            <LocaleSwitch />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
