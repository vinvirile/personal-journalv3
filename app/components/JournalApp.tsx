"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LockKeyhole, Plus } from "lucide-react";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { EntryEditor } from "@/app/components/EntryEditor";
import { EntryIndex } from "@/app/components/EntryIndex";
import { FilterDialog } from "@/app/components/FilterDialog";
import { Logo } from "@/app/components/Logo";
import { PinLock } from "@/app/components/PinLock";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { Toast, type ToastMessage, type ToastTone } from "@/app/components/Toast";
import { useJournal } from "@/app/hooks/useJournal";
import { cx } from "@/app/lib/cn";

type AuthState = "checking" | "locked" | "unlocked";
type MobileView = "list" | "detail";

type PendingAction = {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "danger" | "neutral";
  action: () => void | Promise<void>;
};

export default function JournalApp() {
  const [auth, setAuth] = useState<AuthState>("checking");

  useEffect(() => {
    let active = true;

    fetch("/api/auth", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Session check failed");
        const data: unknown = await response.json();
        const unlocked =
          data !== null &&
          typeof data === "object" &&
          "unlocked" in data &&
          data.unlocked === true;
        if (active) setAuth(unlocked ? "unlocked" : "locked");
      })
      .catch(() => {
        if (active) setAuth("locked");
      });

    return () => {
      active = false;
    };
  }, []);

  if (auth === "checking") return <Splash />;

  if (auth === "locked") {
    return <PinLock onUnlock={() => setAuth("unlocked")} />;
  }

  return (
    <JournalWorkspace
      onLock={async () => {
        try {
          await fetch("/api/auth", { method: "DELETE" });
        } finally {
          setAuth("locked");
        }
      }}
    />
  );
}

function Splash() {
  return (
    <main className="app-bg grid min-h-dvh place-items-center px-6">
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-4"
      >
        <Logo className="size-12 rounded-2xl" iconClassName="size-6" />
        <p className="mono-label">Opening your journal</p>
        <span className="h-1 w-28 overflow-hidden rounded-full bg-border">
          <span className="block h-full w-1/2 animate-pulse-soft rounded-full bg-primary" />
        </span>
      </div>
    </main>
  );
}

function JournalWorkspace({ onLock }: { onLock: () => Promise<void> }) {
  const journal = useJournal();
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [filterOpen, setFilterOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimer = useRef<number | null>(null);

  const notify = useCallback(
    (message: string, tone: ToastTone = "info") => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      setToast({ id: Date.now(), message, tone });
      toastTimer.current = window.setTimeout(() => setToast(null), 4200);
    },
    [],
  );

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  const guard = useCallback(
    (action: () => void | Promise<void>) => {
      if (journal.dirty) {
        setPending({
          title: "Discard unsaved changes?",
          message:
            "This entry has changes that haven’t been saved. Continuing will lose them.",
          confirmLabel: "Discard changes",
          tone: "danger",
          action,
        });
        return;
      }
      void action();
    },
    [journal.dirty],
  );

  const handleSelect = useCallback(
    (id: string) => {
      if (id === journal.selectedId) {
        setMobileView("detail");
        return;
      }
      guard(() => {
        journal.selectEntry(id);
        setMobileView("detail");
      });
    },
    [guard, journal],
  );

  const handleNew = useCallback(() => {
    guard(async () => {
      const id = await journal.createEntry();
      if (id) {
        setMobileView("detail");
        notify("New entry started.", "success");
      } else {
        notify("A new entry could not be created.", "error");
      }
    });
  }, [guard, journal, notify]);

  const handleSave = useCallback(async () => {
    const saved = await journal.save();
    if (!saved) notify("The entry could not be saved.", "error");
  }, [journal, notify]);

  const handleDelete = useCallback(() => {
    const id = journal.selectedId;
    if (!id) return;

    setPending({
      title: "Delete this entry?",
      message:
        "This entry and its words will be removed permanently. This cannot be undone.",
      confirmLabel: "Delete entry",
      tone: "danger",
      action: async () => {
        const removed = await journal.removeEntry(id);
        if (removed) {
          setMobileView("list");
          notify("Entry deleted.", "success");
        } else {
          notify("The entry could not be deleted.", "error");
        }
      },
    });
  }, [journal, notify]);

  const handleLock = useCallback(() => {
    guard(async () => {
      await onLock();
    });
  }, [guard, onLock]);

  const confirmPending = useCallback(async () => {
    if (!pending) return;
    setConfirming(true);
    try {
      await pending.action();
    } finally {
      setConfirming(false);
      setPending(null);
    }
  }, [pending]);

  useEffect(() => {
    if (!journal.dirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [journal.dirty]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier || event.altKey) return;
      if (document.querySelector("dialog[open]")) return;

      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        if (journal.dirty) void handleSave();
      } else if (key === "n") {
        event.preventDefault();
        handleNew();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNew, handleSave, journal.dirty]);

  return (
    <div className="app-bg flex h-dvh overflow-hidden">
      <h1 className="sr-only">Journal</h1>
      <aside
        className="hidden h-full w-[72px] shrink-0 flex-col items-center gap-2 border-r border-border bg-muted/40 px-3 py-4 lg:flex"
        aria-label="Journal actions"
      >
        <div className="mb-2">
          <Logo />
          <span className="sr-only">Journal</span>
        </div>
        <button
          type="button"
          onClick={handleNew}
          disabled={journal.creating}
          aria-label="New entry"
          title="New entry (⌘N)"
          className="btn btn-primary size-11 rounded-xl px-0"
        >
          <Plus className="size-5" strokeWidth={2} aria-hidden="true" />
        </button>
        <div className="mt-auto flex flex-col items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLock}
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
        </div>
      </aside>

      <div
        className={cx(
          "h-full min-h-0 w-full shrink-0 lg:w-[360px] xl:w-[400px]",
          mobileView === "detail" && "hidden lg:block",
        )}
      >
        <EntryIndex
          entries={journal.entries}
          filteredEntries={journal.filteredEntries}
          tags={journal.tags}
          loading={journal.loading}
          loadError={journal.loadError}
          search={journal.search}
          onSearch={journal.setSearch}
          filters={journal.filters}
          hasFilters={journal.hasFilters}
          onOpenFilters={() => setFilterOpen(true)}
          onClearFilters={journal.clearFilters}
          onRemoveDates={() =>
            journal.setFilters((current) => ({
              ...current,
              start: "",
              end: "",
            }))
          }
          onSetTag={(tag) =>
            journal.setFilters((current) => ({ ...current, tag }))
          }
          selectedId={journal.selectedId}
          onSelect={handleSelect}
          onNew={handleNew}
          creating={journal.creating}
          onLock={handleLock}
        />
      </div>

      <div
        className={cx(
          "h-full min-h-0 min-w-0 flex-1",
          mobileView === "list" && "hidden lg:block",
        )}
      >
        <EntryEditor
          entry={journal.selectedEntry}
          draft={journal.draft}
          dirty={journal.dirty}
          saving={journal.saving}
          saveState={journal.saveState}
          allTags={journal.tags.map((item) => item.tag)}
          onDraftChange={journal.updateDraft}
          onSave={handleSave}
          onDelete={handleDelete}
          onBack={() => setMobileView("list")}
          onLock={handleLock}
          onNew={handleNew}
          creating={journal.creating}
          onNotify={notify}
        />
      </div>

      {filterOpen && (
        <FilterDialog
          filters={journal.filters}
          tags={journal.tags}
          onApply={(next) => {
            journal.setFilters(next);
            setFilterOpen(false);
          }}
          onClose={() => setFilterOpen(false)}
        />
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.title ?? ""}
        message={pending?.message ?? ""}
        confirmLabel={pending?.confirmLabel ?? "Confirm"}
        tone={pending?.tone ?? "neutral"}
        loading={confirming}
        onConfirm={() => void confirmPending()}
        onClose={() => {
          if (!confirming) setPending(null);
        }}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
