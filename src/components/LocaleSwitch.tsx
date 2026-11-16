"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { locales } from "@/i18n/config";

/** ES / EN toggle that keeps the visitor on the same page. */
export function LocaleSwitch() {
  const pathname = usePathname();
  const { locale, t } = useI18n();
  const rest = pathname.replace(/^\/(?:es|en)(?=\/|$)/, "");

  return (
    <div
      role="group"
      aria-label={t("nav.language")}
      className="flex rounded-lg border border-line p-0.5 text-xs font-semibold"
    >
      {locales.map((option) => {
        const current = option === locale;
        return (
          <Link
            key={option}
            href={`/${option}${rest}`}
            hrefLang={option}
            lang={option}
            aria-current={current ? "true" : undefined}
            className={`rounded-md px-2.5 py-1 transition-colors ${
              current ? "bg-raised text-ink" : "text-ink-3 hover:text-ink"
            }`}
          >
            {option.toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
}
