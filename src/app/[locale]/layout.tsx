import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { I18nProvider } from "@/i18n/client";
import { locales } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

/** The two languages are known at build time, so every page shell is prerendered for both. */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: {
      default: `${t("meta.title")} · ${t("meta.tagline")}`,
      template: `%s · ${t("meta.title")}`,
    },
    description: t("meta.description"),
  };
}

export const viewport: Viewport = {
  themeColor: "#0b0e14",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: LayoutProps<"/[locale]">) {
  const { locale, t } = await getI18n();

  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="page-glow flex min-h-dvh flex-col">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-raised focus:px-3 focus:py-2"
        >
          {t("nav.skip")}
        </a>
        <I18nProvider locale={locale}>
          <Header />
          <main id="content" className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
            {children}
          </main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
