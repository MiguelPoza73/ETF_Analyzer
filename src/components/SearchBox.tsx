"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/i18n/client";
import { assetPath } from "@/lib/market-data/symbols";
import type { SearchHit } from "@/lib/market-data/types";
import { SearchIcon } from "./icons";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

type SearchState =
  | { status: "idle" }
  | { status: "loading"; hits: SearchHit[] }
  | { status: "done"; hits: SearchHit[] }
  | { status: "error" };

interface SearchBoxProps {
  /** "lg" for the home page hero, "md" for the compact version on asset pages. */
  size?: "lg" | "md";
  autoFocus?: boolean;
}

/** Search field with autocomplete. Follows the ARIA combobox pattern. */
export function SearchBox({ size = "lg", autoFocus = false }: SearchBoxProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);

  const trimmed = query.trim();
  const hits = state.status === "loading" || state.status === "done" ? state.hits : [];

  useEffect(() => {
    if (trimmed.length < MIN_QUERY_LENGTH) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const data: { ok: boolean; hits?: SearchHit[] } = await response.json();
        if (!response.ok || !data.ok) throw new Error("Search failed");
        setState({ status: "done", hits: data.hits ?? [] });
        setActiveIndex(0);
      } catch {
        if (!controller.signal.aborted) setState({ status: "error" });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  function handleChange(value: string) {
    setQuery(value);
    setOpen(true);
    if (value.trim().length < MIN_QUERY_LENGTH) {
      setState({ status: "idle" });
    } else {
      // Keep showing the previous results while the new ones load.
      setState((previous) => ({
        status: "loading",
        hits: previous.status === "loading" || previous.status === "done" ? previous.hits : [],
      }));
    }
  }

  function select(hit: SearchHit) {
    setOpen(false);
    setQuery("");
    setState({ status: "idle" });
    router.push(`/${locale}${assetPath(hit.symbol)}`);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (hits.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % hits.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index - 1 + hits.length) % hits.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      select(hits[Math.min(activeIndex, hits.length - 1)]);
    }
  }

  const showPanel = open && state.status !== "idle";
  const large = size === "lg";

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label className="sr-only" htmlFor={`${listId}-input`}>
        {t("search.label")}
      </label>
      <div
        className={`flex items-center gap-3 rounded-2xl border border-line-strong bg-surface transition-colors focus-within:border-accent ${
          large ? "px-5 py-4" : "px-4 py-2.5"
        }`}
      >
        <SearchIcon
          className="shrink-0 text-ink-3"
          width={large ? 20 : 16}
          height={large ? 20 : 16}
        />
        <input
          id={`${listId}-input`}
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            showPanel && hits.length > 0 ? `${listId}-option-${activeIndex}` : undefined
          }
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
          value={query}
          placeholder={t("search.placeholder")}
          onChange={(event) => handleChange(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className={`w-full min-w-0 bg-transparent text-ink outline-none placeholder:text-ink-3 [&::-webkit-search-cancel-button]:hidden ${
            large ? "text-lg" : "text-sm"
          }`}
        />
        {state.status === "loading" && (
          <span
            role="status"
            aria-label={t("search.loading")}
            className="size-4 shrink-0 animate-spin rounded-full border-2 border-line-strong border-t-accent"
          />
        )}
      </div>

      {showPanel && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-line-strong bg-raised shadow-2xl shadow-black/50">
          {hits.length > 0 ? (
            <ul id={listId} role="listbox" aria-label={t("search.results")} className="max-h-96 overflow-y-auto p-1.5">
              {hits.map((hit, index) => (
                <li
                  key={hit.symbol}
                  id={`${listId}-option-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  // Keep focus on the input so the click is not lost to a blur.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => select(hit)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${
                    index === activeIndex ? "bg-accent-soft" : ""
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{hit.name}</span>
                    <span className="block truncate text-xs text-ink-3">
                      {hit.symbol}
                      {hit.exchange ? ` · ${hit.exchange}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-md border border-line px-1.5 py-0.5 text-[11px] font-medium text-ink-2">
                    {t(`assetType.${hit.type}`)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p id={listId} role="status" className="px-4 py-3.5 text-sm text-ink-2">
              {state.status === "error"
                ? t("search.error")
                : state.status === "loading"
                  ? t("search.loading")
                  : t("search.empty", { query: trimmed })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
