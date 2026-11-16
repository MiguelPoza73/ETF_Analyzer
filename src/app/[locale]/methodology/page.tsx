import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { methodologyContent } from "./content";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("nav.methodology") };
}

export default async function MethodologyPage() {
  const content = methodologyContent(await getI18n());

  return (
    <article className="mx-auto max-w-2xl py-10 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {content.title}
      </h1>
      <p className="mt-4 text-pretty text-lg text-ink-2">{content.intro}</p>

      {content.sections.map((section) => (
        <section key={section.title} className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight text-ink">{section.title}</h2>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph} className="mt-3 text-pretty leading-relaxed text-ink-2">
              {paragraph}
            </p>
          ))}
          {section.items && (
            <dl className="mt-4 space-y-3">
              {section.items.map((item) => (
                <div key={item.term} className="rounded-xl border border-line bg-surface px-4 py-3.5">
                  <dt className="font-medium text-ink">{item.term}</dt>
                  <dd className="mt-1 text-pretty text-sm leading-relaxed text-ink-2">
                    {item.text}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      ))}
    </article>
  );
}
