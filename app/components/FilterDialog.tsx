"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, X } from "lucide-react";
import { cx } from "@/app/lib/cn";
import type { JournalFilters, TagCount } from "@/app/lib/types";

type FilterDialogProps = {
  filters: JournalFilters;
  tags: TagCount[];
  onApply: (filters: JournalFilters) => void;
  onClose: () => void;
};

export function FilterDialog({
  filters,
  tags,
  onApply,
  onClose,
}: FilterDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const startRef = useRef<HTMLInputElement>(null);

  const [start, setStart] = useState(filters.start);
  const [end, setEnd] = useState(filters.end);
  const [tag, setTag] = useState(filters.tag);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    startRef.current?.focus();
  }, []);

  const invalid = Boolean(start && end && start > end);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="filter-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="dialog-sheet"
    >
      <div className="dialog-panel max-h-[85dvh] overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mono-label">Narrow the view</p>
            <h2
              id="filter-title"
              className="mt-1 text-base font-semibold tracking-tight"
            >
              Filter entries
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="icon-button -mr-2 -mt-2 size-11 rounded-lg"
          >
            <X className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <fieldset className="mt-6">
          <legend className="mono-label">Date range</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                From
              </span>
              <input
                ref={startRef}
                type="date"
                value={start}
                max={end || undefined}
                onChange={(event) => setStart(event.target.value)}
                className="field"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                To
              </span>
              <input
                type="date"
                value={end}
                min={start || undefined}
                onChange={(event) => setEnd(event.target.value)}
                className="field"
              />
            </label>
          </div>
          {invalid && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              The start date must come before the end date.
            </p>
          )}
        </fieldset>

        <fieldset className="mt-6">
          <legend className="mono-label">Tag</legend>
          <div className="scroll-area mt-2 max-h-56 overflow-y-auto rounded-xl border border-border bg-muted/25 p-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={tag === null}
                onClick={() => setTag(null)}
                className={cx(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors duration-200",
                  tag === null
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-surface-hover",
                )}
              >
                {tag === null && (
                  <Check className="size-4" strokeWidth={2} aria-hidden="true" />
                )}
                All tags
              </button>
              {tags.map((item) => {
                const selected = tag === item.tag.toLowerCase();
                return (
                  <button
                    key={item.tag.toLowerCase()}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      setTag(selected ? null : item.tag.toLowerCase())
                    }
                    className={cx(
                      "inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors duration-200",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:bg-surface-hover",
                    )}
                  >
                    {selected && (
                      <Check
                        className="size-4"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    )}
                    {item.tag}
                    <span className="font-mono text-[10px] opacity-70">
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
            {tags.length === 0 && (
              <p className="p-1 text-sm text-muted-foreground">
                Tags will appear here once you add some.
              </p>
            )}
          </div>
        </fieldset>

        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => {
              setStart("");
              setEnd("");
              setTag(null);
            }}
            className="btn btn-ghost"
          >
            Clear all
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1 sm:flex-none"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={invalid}
              onClick={() => onApply({ start, end, tag })}
              className="btn btn-primary flex-1 sm:flex-none"
            >
              <CalendarDays
                className="size-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              Apply
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
