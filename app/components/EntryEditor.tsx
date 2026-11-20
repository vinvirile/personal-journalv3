"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Loader2,
  LockKeyhole,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { cx } from "@/app/lib/cn";
import {
  formatClock,
  formatEntryDate,
  formatLongDate,
  formatUpdated,
  normaliseTags,
  parseTags,
  readingMinutes,
  wordCount,
} from "@/app/lib/date";
import type { Draft, Entry, SaveState } from "@/app/lib/types";
import type { ToastTone } from "@/app/components/Toast";

type AiKind = "title" | "tags";

const SUGGESTED_TAGS = [
  { tag: "serious", emoji: "🧐" },
  { tag: "dump", emoji: "🗑️" },
  { tag: "vent", emoji: "😤" },
  { tag: "idea", emoji: "💡" },
  { tag: "question", emoji: "❓" },
  { tag: "positivity", emoji: "☀️" },
  { tag: "goal", emoji: "🎯" },
  { tag: "Mugshots", emoji: "🍔" },
  { tag: "dream", emoji: "🌙" },
  { tag: "quote", emoji: "💬" },
] as const;

const SUGGESTED_TAG_SET = new Set<string>(
  SUGGESTED_TAGS.map((item) => item.tag.toLowerCase()),
);

type EntryEditorProps = {
  className?: string;
  entry: Entry | undefined;
  draft: Draft;
  dirty: boolean;
  saving: boolean;
  saveState: SaveState;
  allTags: string[];
  onDraftChange: (patch: Partial<Draft>) => void;
  onSave: () => void;
  onDelete: () => void;
  onBack: () => void;
  onLock: () => void;
  onNew: () => void;
  creating: boolean;
  onNotify: (message: string, tone?: ToastTone) => void;
};

function readError(data: unknown): string | null {
  if (data && typeof data === "object" && "error" in data) {
    return typeof data.error === "string" ? data.error : null;
  }
  return null;
}

function readStringField(data: unknown, field: string): string | null {
  if (!data || typeof data !== "object" || !(field in data)) return null;
  const value: unknown = Reflect.get(data, field);
  return typeof value === "string" && value.trim() ? value : null;
}

export function EntryEditor({
  className,
  entry,
  draft,
  dirty,
  saving,
  saveState,
  allTags,
  onDraftChange,
  onSave,
  onDelete,
  onBack,
  onLock,
  onNew,
  creating,
  onNotify,
}: EntryEditorProps) {
  const [aiBusy, setAiBusy] = useState<AiKind | null>(null);
  const [tagInput, setTagInput] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const tags = useMemo(() => parseTags(draft.tags), [draft.tags]);
  const customTags = tags.filter(
    (tag) => !SUGGESTED_TAG_SET.has(tag.toLowerCase()),
  );
  const words = useMemo(() => wordCount(draft.content), [draft.content]);
  const minutes = readingMinutes(words);

  const status = saving
    ? { label: "Saving…", tone: "text-muted-foreground" }
    : saveState === "error"
      ? { label: "Couldn’t save", tone: "text-destructive" }
      : dirty
        ? { label: "Unsaved changes", tone: "text-secondary" }
        : saveState === "saved"
          ? { label: "Saved", tone: "text-secondary" }
          : { label: "Up to date", tone: "text-muted-foreground" };

  async function suggest(kind: AiKind) {
    if (!draft.content.trim()) {
      onNotify("Write a little first, then ask for a suggestion.", "info");
      return;
    }

    setAiBusy(kind);

    try {
      const response = await fetch(`/api/ai/generate-${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft.content }),
      });
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          readError(data) ?? "The suggestion could not be generated.",
        );
      }

      const value = readStringField(data, kind === "title" ? "title" : "tags");
      if (!value) throw new Error("The suggestion came back empty.");

      onDraftChange(kind === "title" ? { title: value } : { tags: value });
      onNotify(
        kind === "title" ? "Title suggested." : "Tags suggested.",
        "success",
      );
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "The suggestion could not be generated.",
        "error",
      );
    } finally {
      setAiBusy(null);
    }
  }

  function commitTag() {
    const value = tagInput.trim();
    if (!value) return;
    onDraftChange({
      tags: normaliseTags([...tags, value].join(", ")),
    });
    setTagInput("");
  }

  function removeTag(tag: string) {
    onDraftChange({
      tags: tags
        .filter((item) => item.toLowerCase() !== tag.toLowerCase())
        .join(", "),
    });
  }

  function toggleSuggestedTag(tag: string) {
    const exists = tags.some(
      (item) => item.toLowerCase() === tag.toLowerCase(),
    );
    onDraftChange({
      tags: exists
        ? tags
            .filter((item) => item.toLowerCase() !== tag.toLowerCase())
            .join(", ")
        : normaliseTags([...tags, tag].join(", ")),
    });
  }

  if (!entry) {
    return (
      <section
        className={cx(
          "flex h-full min-h-0 flex-1 flex-col bg-background",
          className,
        )}
      >
        <div className="grid flex-1 place-items-center px-6 py-12">
          <div className="max-w-sm text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-card text-muted-foreground shadow-soft">
              <BookOpen
                className="size-7"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </span>
            <p className="mono-label mt-5">A blank page</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em]">
              Your first entry is waiting
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Start with what happened today, or open an entry from the index.
            </p>
            <button
              type="button"
              onClick={onNew}
              disabled={creating}
              className="btn btn-primary mt-5"
            >
              <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
              Start writing
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cx(
        "flex h-full min-h-0 min-w-0 flex-1 flex-col bg-background",
        className,
      )}
      aria-label="Entry editor"
    >
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/85 px-3 py-2.5 backdrop-blur-sm safe-top sm:px-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to entries"
          className="icon-button lg:hidden"
        >
          <ArrowLeft
            className="size-5"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </button>

        <div className="min-w-0 flex-1">
          <p className="mono-label truncate text-[10px]">
            <span className="sm:hidden">
              {formatEntryDate(entry.strict_date)}
            </span>
            <span className="hidden sm:inline">
              {formatLongDate(entry.strict_date)}
            </span>
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              className={cx("size-1.5 rounded-full", status.tone)}
              aria-hidden="true"
            />
            <span
              className={cx("text-[11px] font-medium", status.tone)}
              aria-live="polite"
            >
              {status.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onLock}
            aria-label="Lock journal"
            title="Lock journal"
            className="icon-button lg:hidden"
          >
            <LockKeyhole
              className="size-5"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete entry"
            title="Delete entry"
            className="icon-button text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2
              className="size-5"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || saving}
            title="Save entry (⌘S)"
            className={cx("btn px-4", dirty ? "btn-primary" : "btn-secondary")}
          >
            {saving ? (
              <Loader2
                className="size-4 animate-spin"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            ) : null}
            Save
          </button>
        </div>
      </header>

      <div className="scroll-area min-h-0 flex-1 overflow-y-auto">
        <article className="mx-auto w-full max-w-[68ch] px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="mono-label">{formatClock(entry.created_at)}</span>
            {entry.updated_at && entry.updated_at !== entry.created_at && (
              <>
                <span aria-hidden="true">·</span>
                <span className="mono-label">
                  Updated {formatUpdated(entry.updated_at)}
                </span>
              </>
            )}
          </div>

          <div className="mt-4 flex items-start gap-2">
            <textarea
              value={draft.title}
              onChange={(event) => onDraftChange({ title: event.target.value })}
              placeholder="Untitled entry"
              rows={1}
              aria-label="Entry title"
              className="editor-title"
            />
            <button
              type="button"
              onClick={() => void suggest("title")}
              disabled={!draft.content.trim() || aiBusy !== null}
              aria-label="Suggest a title with AI"
              title="Suggest a title"
              className="icon-button mt-1 shrink-0 text-accent hover:bg-accent/10 hover:text-accent"
            >
              {aiBusy === "title" ? (
                <Loader2
                  className="size-5 animate-spin"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              ) : (
                <Sparkles
                  className="size-5"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              )}
            </button>
          </div>

          <textarea
            ref={bodyRef}
            value={draft.content}
            onChange={(event) => onDraftChange({ content: event.target.value })}
            placeholder="Start with what happened, what you noticed, what you want to remember…"
            rows={1}
            aria-label="Journal entry"
            className="editor-body mt-6"
          />

          <div className="mt-10 border-t border-border pt-6">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="entry-tags" className="mono-label">
                Tags
              </label>
              <button
                type="button"
                onClick={() => void suggest("tags")}
                disabled={!draft.content.trim() || aiBusy !== null}
                aria-label="Suggest tags with AI"
                title="Suggest tags"
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-accent transition-colors duration-200 hover:bg-accent/10 disabled:opacity-40"
              >
                {aiBusy === "tags" ? (
                  <Loader2
                    className="size-3.5 animate-spin"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                ) : (
                  <Sparkles
                    className="size-3.5"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                )}
                Suggest
              </button>
            </div>

            <div
              className="mt-3 flex flex-wrap gap-2"
              aria-label="Suggested tags"
            >
              {SUGGESTED_TAGS.map(({ tag, emoji }) => {
                const selected = tags.some(
                  (item) => item.toLowerCase() === tag.toLowerCase(),
                );
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleSuggestedTag(tag)}
                    className={cx(
                      "inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 font-mono text-[11px] tracking-[0.04em] transition-colors duration-200",
                      selected
                        ? "border-primary bg-primary text-on-primary shadow-soft hover:bg-primary-hover"
                        : "border-border bg-card text-muted-foreground hover:border-border-strong hover:bg-surface-hover hover:text-foreground",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="text-[13px] leading-none"
                    >
                      {emoji}
                    </span>
                    {tag}
                    {selected && (
                      <Check
                        className="size-3.5"
                        strokeWidth={2.25}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {customTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {customTags.map((tag) => (
                  <span key={tag} className="tag-chip min-h-7 text-xs">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove tag ${tag}`}
                      className="grid size-5 place-items-center rounded-sm hover:text-foreground"
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <input
              id="entry-tags"
              type="text"
              value={tagInput}
              list="journal-tag-suggestions"
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === ",") {
                  event.preventDefault();
                  commitTag();
                } else if (event.key === "Backspace" && !tagInput) {
                  const last = tags.at(-1);
                  if (last) removeTag(last);
                }
              }}
              onBlur={commitTag}
              placeholder="Add a tag, then press Enter"
              className="field mt-3"
            />
            <datalist id="journal-tag-suggestions">
              {allTags
                .filter(
                  (tag) =>
                    !tags.some(
                      (current) =>
                        current.toLowerCase() === tag.toLowerCase(),
                    ),
                )
                .map((tag) => (
                  <option key={tag} value={tag} />
                ))}
            </datalist>
          </div>
        </article>
      </div>

      <footer className="border-t border-border bg-background px-4 py-2.5 safe-bottom">
        <div className="mx-auto flex max-w-[68ch] items-center justify-between gap-3">
          <span className="mono-label text-[10px]">
            {words} {words === 1 ? "word" : "words"} · {minutes} min read
          </span>
          <span
            className={cx("text-[11px] font-medium", status.tone)}
            aria-hidden="true"
          >
            {status.label}
          </span>
        </div>
      </footer>
    </section>
  );
}
