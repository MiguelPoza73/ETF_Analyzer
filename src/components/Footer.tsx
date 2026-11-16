import Link from "next/link";
import { getI18n } from "@/i18n/server";

/** Link to the source code when the app is deployed from a Git repository. */
function repositoryUrl(): string | null {
  const owner = process.env.VERCEL_GIT_REPO_OWNER;
  const repo = process.env.VERCEL_GIT_REPO_SLUG;
  return owner && repo ? `https://github.com/${owner}/${repo}` : null;
}

export async function Footer() {
  const { t, locale } = await getI18n();
  const repository = repositoryUrl();

  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto max-w-6xl space-y-3 px-4 py-8 text-sm text-ink-3 sm:px-6">
        <p className="max-w-3xl">{t("footer.disclaimer")}</p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <span>{t("footer.data")}</span>
          <Link
            href={`/${locale}/methodology`}
            className="text-ink-2 underline-offset-4 hover:underline"
          >
            {t("footer.methodology")}
          </Link>
          {repository && (
            <a
              href={repository}
              target="_blank"
              rel="noreferrer"
              className="text-ink-2 underline-offset-4 hover:underline"
            >
              GitHub
            </a>
          )}
        </p>
      </div>
    </footer>
  );
}
