import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { isLocale } from "./config";
import { createI18n, type I18n } from "./core";

/**
 * Translations for the language of the current request, for Server
 * Components. The language is the first segment of the URL (/es or /en).
 */
export async function getI18n(): Promise<I18n> {
  const locale = await localeParam();
  if (!isLocale(locale)) notFound();
  return createI18n(locale);
}
