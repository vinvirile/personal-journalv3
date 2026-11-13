"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  BookOpen,
  LockKeyhole,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Logo } from "@/app/components/Logo";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { cx } from "@/app/lib/cn";
import {
  formatClock,
  formatEntryDate,
  formatMonthLabel,
  monthKey,
  parseTags,
} from "@/app/lib/date";
import type {
  Entry,
  JournalFilters,
  TagCount,
} from "@/app/lib/types";

type EntryIndexProps = {
  className?: string;
  entries: Entry[];
  filteredEntries: Entry[];
  tags: TagCount[];
  loading: boolean;
  loadError: string | null;
  search: string;
  onSearch: (value: string) => void;
  filters: JournalFilters;
  hasFilters: boolean;
  onOpenFilters: () => void;
  onClearFilters: () => void;
  onRemoveDates: () => void;
  onSetTag: (tag: string | null) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  creating: boolean;
  onLock: () => void;
};

function dateRangeLabel(filters: JournalFilters): string | null {
  if (filters.start && filters.end) {
    return `${formatEntryDate(filters.start)} – ${formatEntryDate(filters.end)}`;
  }
  if (filters.start) return `From ${formatEntryDate(filters.start)}`;
  if (filters.end) return `Until ${formatEntryDate(filters.end)}`;
  return null;
}

export function EntryIndex({
  className,
  entries,
  filteredEntries,
  tags,
  loading,
  loadError,
  search,
  onSearch,
  filters,
  hasFilters,
  onOpenFilters,
  onClearFilters,
  onRemoveDates,
  onSetTag,
  selectedId,
  onSelect,
  onNew,
  creating,
  onLock,
}: EntryIndexProps) {
  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const entry of filteredEntries) {
      const key = monthKey(entry.strict_date);
      const group = map.get(key);
      if (group) group.push(entry);
      else map.set(key, [entry]);
    }
    return [...map.entries()];
  }, [filteredEntries]);

  const quickTags = tags.slice(0, 5);
  const rangeLabel = dateRangeLabel(filters);
  const isFiltered = hasFilters || Boolean(search.trim());
  const countLabel = isFiltered
    ? `${filteredEntries.length} of ${entries.length}`
    : `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`;

  return (
    <aside
      className={cx(
        "relative flex h-full min-h-0 w-full shrink-0 flex-col border-r border-border bg-muted/45 lg:w-[360px] xl:w-[400px]",
        className,
      )}
      aria-label="Journal entries"
    >
      <header className="lg:hidden flex items-center gap-2.5 border-b border-border px-3 py-2.5 safe-top">
        <Logo className="size-9 rounded-lg" iconClassName="size-4" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-tight">
            Journal
          </p>
          <p className="mono-label text-[10px]">Private notes</p>
        </div>
        <ThemeToggle />
        <button
          type="button"
          onClick={onLock}
          aria-label="Lock journal"
          title="Lock journal"
          className="icon-button"
        >
          <LockKeyhole
            className="size-5"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </button>
      </header>

      <div className="px-3.5 pb-2 pt-4 sm:px-4">
        <div className="hidden items-end justify-between gap-3 lg:flex">
          <div>
            <p className="mono-label">Private journal</p>
            <p className="mt-1 text-xl font-semibold tracking-[-0.02em]">
              Journal
            </p>
          </div>
          <button
            type="button"
            onClick={onNew}
            disabled={creating}
            className="btn btn-primary gap-1.5 px-3"
          >
            <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
            New
          </button>
        </div>

        <div className="relative mt-4">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search entries"
            aria-label="Search entries"
            className="field appearance-none pl-9 pr-10 [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch("")}
              aria-label="Clear search"
              className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenFilters}
            aria-haspopup="dialog"
            className={cx(
              "btn flex-1 justify-start gap-2 text-sm",
              hasFilters
                ? "border-primary/40 bg-primary/5 text-primary"
                : "btn-secondary",
            )}
          >
            <SlidersHorizontal
              className="size-4"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            Filter
            {hasFilters && (
              <span className="ml-auto rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                {(rangeLabel ? 1 : 0) + (filters.tag ? 1 : 0)}
              </span>
            )}
          </button>
          {hasFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              aria-label="Clear all filters"
              className="icon-button"
            >
              <X className="size-4" strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="mono-label" role="status" aria-live="polite">
            {countLabel}
          </span>
          <span className="mono-label text-[10px]">Newest first</span>
        </div>

        {(rangeLabel || filters.tag || search) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {search && (
              <span className="tag-chip">
                “{search}”
                <button
                  type="button"
                  onClick={() => onSearch("")}
                  aria-label="Clear search filter"
                  className="grid size-4 place-items-center rounded-sm hover:text-foreground"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            )}
            {rangeLabel && (
              <span className="tag-chip">
                {rangeLabel}
                <button
                  type="button"
                  onClick={onRemoveDates}
                  aria-label="Clear date filter"
                  className="grid size-4 place-items-center rounded-sm hover:text-foreground"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            )}
            {filters.tag && (
              <span className="tag-chip">
                #{filters.tag}
                <button
                  type="button"
                  onClick={onClearFilters}
                  aria-label="Clear tag filter"
                  className="grid size-4 place-items-center rounded-sm hover:text-foreground"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            )}
          </div>
        )}

        {quickTags.length > 0 && !search && !filters.tag && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {quickTags.map((item) => {
              const selected = filters.tag === item.tag.toLowerCase();
              return (
                <button
                  key={item.tag.toLowerCase()}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    onSetTag(selected ? null : item.tag.toLowerCase())
                  }
                  className={cx(
                    "shrink-0 rounded-full border px-3 font-mono text-[10px] leading-none tracking-[0.04em] transition-colors duration-200 min-h-11 inline-flex items-center",
                    selected
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-surface-hover",
                  )}
                >
                  #{item.tag}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="scroll-area min-h-0 flex-1 overflow-y-auto px-3 pb-28 pt-2 lg:pb-4">
        {loading && entries.length === 0 ? (
          <div className="space-y-2" aria-label="Loading entries">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-card border border-border bg-card/70"
              />
            ))}
          </div>
        ) : loadError ? (
          <div className="m-1 rounded-card border border-destructive/30 bg-destructive/5 p-4">
            <AlertTriangle
              className="size-5 text-destructive"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <p className="mt-2 text-sm font-semibold">Journal unavailable</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {loadError}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn btn-secondary mt-3"
            >
              Retry
            </button>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="mx-auto mt-14 max-w-[16rem] px-4 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-card text-muted-foreground shadow-soft">
              <BookOpen
                className="size-6"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </span>
            <h2 className="mt-4 text-sm font-semibold">
              {hasFilters || search ? "No entries match" : "A quiet start"}
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
              {hasFilters || search
                ? "Try a different search or clear the filters."
                : "Write the first entry and it will appear here."}
            </p>
            {hasFilters || search ? (
              <button
                type="button"
                onClick={() => {
                  onSearch("");
                  onClearFilters();
                }}
                className="btn btn-secondary mt-4"
              >
                Clear filters
              </button>
            ) : (
              <button
                type="button"
                onClick={onNew}
                disabled={creating}
                className="btn btn-primary mt-4"
              >
                <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
                New entry
              </button>
            )}
          </div>
        ) : (
          groups.map(([key, group]) => (
            <section key={key} className="mb-5">
              <h2 className="mono-label px-1.5 pb-2 pt-1">
                {formatMonthLabel(key)}
              </h2>
              <div className="space-y-1.5">
                {group.map((entry, index) => {
                  const selected = entry.id === selectedId;
                  const entryTags = parseTags(entry.tags).slice(0, 3);
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => onSelect(entry.id)}
                      aria-current={selected ? "true" : undefined}
                      style={{
                        animationDelay: `${Math.min(index, 6) * 24}ms`,
                      }}
                      className={cx(
                        "animate-rise block w-full rounded-card border p-3.5 text-left transition-colors duration-200",
                        selected
                          ? "border-primary/45 bg-selected shadow-soft"
                          : "border-transparent hover:border-border hover:bg-surface-hover",
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="mono-label text-[10px]">
                          {formatEntryDate(entry.strict_date)}
                        </span>
                        <span className="mono-label text-[10px] opacity-80">
                          {formatClock(entry.created_at)}
                        </span>
                      </div>
                      <h3
                        className={cx(
                          "mt-1 truncate text-[15px] font-semibold tracking-[-0.01em]",
                          selected ? "text-primary" : "text-foreground",
                        )}
                      >
                        {entry.title.trim() || "Untitled entry"}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-muted-foreground">
                        {entry.content.trim() || "No words yet."}
                      </p>
                      {entryTags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {entryTags.map((tag) => (
                            <span key={tag} className="tag-chip text-[10px]">
                              {tag}
                            </span>
                          ))}
                          {parseTags(entry.tags).length > 3 && (
                            <span className="px-1 font-mono text-[10px] text-muted-foreground">
                              +{parseTags(entry.tags).length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={onNew}
        disabled={creating}
        aria-label="New entry"
        className="btn btn-primary fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-30 size-14 rounded-full px-0 shadow-lift lg:hidden"
      >
        <Plus className="size-6" strokeWidth={2} aria-hidden="true" />
      </button>
    </aside>
  );
}
