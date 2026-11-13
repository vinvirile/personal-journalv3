"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "@/app/lib/firebase";
import {
  EMPTY_DRAFT,
  type Draft,
  type Entry,
  type JournalFilters,
  type SaveState,
  type TagCount,
} from "@/app/lib/types";
import {
  isInDateRange,
  normaliseTags,
  parseTags,
  todayISODate,
} from "@/app/lib/date";

const EMPTY_FILTERS: JournalFilters = { start: "", end: "", tag: null };
const MISSING_FIREBASE =
  "Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* variables to .env.local or Netlify.";

function timestampToISO(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;

  if (value && typeof value === "object" && "toDate" in value) {
    const toDate = value.toDate;
    if (typeof toDate === "function") {
      const date: unknown = toDate.call(value);
      if (date instanceof Date) return date.toISOString();
    }
  }

  return new Date().toISOString();
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function mapEntry(id: string, data: Record<string, unknown>): Entry {
  const createdAt = timestampToISO(data.created_at);
  return {
    id,
    title: text(data.title),
    content: text(data.content),
    tags: text(data.tags),
    strict_date: text(data.strict_date) || createdAt.slice(0, 10),
    created_at: createdAt,
    updated_at:
      data.updated_at == null ? undefined : timestampToISO(data.updated_at),
  };
}

export function useJournal() {
  const firebaseReady = isFirebaseConfigured();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(firebaseReady);
  const [loadError, setLoadError] = useState<string | null>(
    firebaseReady ? null : MISSING_FIREBASE,
  );

  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<JournalFilters>(EMPTY_FILTERS);

  const selectedIdRef = useRef<string | null>(null);
  const hydratedFor = useRef<string | null>(null);
  const creatingRef = useRef(false);

  const applySelection = useCallback((id: string | null) => {
    selectedIdRef.current = id;
    setSelectedIdState(id);
  }, []);

  const hydrate = useCallback((entry: Entry) => {
    hydratedFor.current = entry.id;
    setDraft({
      title: entry.title,
      content: entry.content,
      tags: entry.tags ?? "",
    });
    setDirty(false);
    setSaveState("idle");
  }, []);

  useEffect(() => {
    if (!firebaseReady) return;

    let unsubscribe: (() => void) | undefined;

    try {
      const journalQuery = query(
        collection(getDb(), "journal_entries"),
        orderBy("created_at", "desc"),
      );

      unsubscribe = onSnapshot(
        journalQuery,
        (snapshot) => {
          const next = snapshot.docs.map((item) =>
            mapEntry(item.id, item.data() as Record<string, unknown>),
          );
          setEntries(next);
          setLoading(false);
          setLoadError(null);

          const current = selectedIdRef.current;
          const nextId =
            current && next.some((entry) => entry.id === current)
              ? current
              : (next[0]?.id ?? null);

          applySelection(nextId);

          if (nextId && hydratedFor.current !== nextId) {
            const entry = next.find((item) => item.id === nextId);
            if (entry) hydrate(entry);
          }
        },
        (error) => {
          console.error("Journal subscription failed:", error);
          setLoadError(
            error.code === "permission-denied"
              ? "Firestore denied access. Check the security rules for journal_entries."
              : "The journal could not be loaded. Check your connection and try again.",
          );
          setLoading(false);
        },
      );
    } catch (error) {
      console.error("Journal initialisation failed:", error);
      queueMicrotask(() => {
        setLoadError(
          error instanceof Error
            ? error.message
            : "The journal could not be opened.",
        );
        setLoading(false);
      });
    }

    return () => unsubscribe?.();
  }, [applySelection, firebaseReady, hydrate]);

  const selectEntry = useCallback(
    (id: string) => {
      const entry = entries.find((item) => item.id === id);
      applySelection(id);
      if (entry && hydratedFor.current !== id) hydrate(entry);
    },
    [applySelection, entries, hydrate],
  );

  const updateDraft = useCallback((patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setDirty(true);
    setSaveState("dirty");
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    if (!selectedId || saving) return false;
    if (!dirty) return true;

    setSaving(true);
    setSaveState("saving");

    try {
      await updateDoc(doc(getDb(), "journal_entries", selectedId), {
        title: draft.title.trim(),
        content: draft.content,
        tags: normaliseTags(draft.tags),
        updated_at: Timestamp.now(),
      });
      setDirty(false);
      setSaveState("saved");
      return true;
    } catch (error) {
      console.error("Saving entry failed:", error);
      setSaveState("error");
      return false;
    } finally {
      setSaving(false);
    }
  }, [dirty, draft, saving, selectedId]);

  const createEntry = useCallback(async (): Promise<string | null> => {
    if (creatingRef.current) return null;
    creatingRef.current = true;
    setCreating(true);

    try {
      const createdAt = Timestamp.now();
      const strictDate = todayISODate();
      const reference = await addDoc(
        collection(getDb(), "journal_entries"),
        {
          title: "",
          content: "",
          tags: "",
          strict_date: strictDate,
          created_at: createdAt,
          updated_at: null,
        },
      );

      const optimistic: Entry = {
        id: reference.id,
        title: "",
        content: "",
        tags: "",
        strict_date: strictDate,
        created_at: createdAt.toDate().toISOString(),
      };

      setEntries((current) => [
        optimistic,
        ...current.filter((entry) => entry.id !== reference.id),
      ]);
      hydratedFor.current = reference.id;
      setDraft(EMPTY_DRAFT);
      setDirty(false);
      setSaveState("idle");
      applySelection(reference.id);
      return reference.id;
    } catch (error) {
      console.error("Creating entry failed:", error);
      return null;
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  }, [applySelection]);

  const removeEntry = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await deleteDoc(doc(getDb(), "journal_entries", id));
        const remaining = entries.filter((entry) => entry.id !== id);
        setEntries(remaining);

        if (selectedIdRef.current === id) {
          const next = remaining[0];
          applySelection(next?.id ?? null);
          if (next) {
            hydrate(next);
          } else {
            hydratedFor.current = null;
            setDraft(EMPTY_DRAFT);
            setDirty(false);
            setSaveState("idle");
          }
        }

        return true;
      } catch (error) {
        console.error("Deleting entry failed:", error);
        return false;
      }
    },
    [applySelection, entries, hydrate],
  );

  const filteredEntries = useMemo(() => {
    const term = search.trim().toLowerCase();

    return entries.filter((entry) => {
      if (term) {
        const haystack =
          `${entry.title}\n${entry.content}\n${entry.tags}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      if (filters.tag) {
        const matchesTag = parseTags(entry.tags).some(
          (tag) => tag.toLowerCase() === filters.tag,
        );
        if (!matchesTag) return false;
      }

      return isInDateRange(entry.strict_date, filters.start, filters.end);
    });
  }, [entries, filters, search]);

  const tags = useMemo<TagCount[]>(() => {
    const counts = new Map<string, TagCount>();

    for (const entry of entries) {
      for (const tag of parseTags(entry.tags)) {
        const key = tag.toLowerCase();
        const current = counts.get(key);
        if (current) {
          current.count += 1;
        } else {
          counts.set(key, { tag, count: 1 });
        }
      }
    }

    return [...counts.values()].sort(
      (a, b) => b.count - a.count || a.tag.localeCompare(b.tag),
    );
  }, [entries]);

  const hasFilters = Boolean(filters.start || filters.end || filters.tag);
  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const selectedEntry = entries.find((entry) => entry.id === selectedId);

  return {
    entries,
    filteredEntries,
    tags,
    loading,
    loadError,
    search,
    setSearch,
    filters,
    setFilters,
    hasFilters,
    clearFilters,
    selectedId,
    selectedEntry,
    selectEntry,
    draft,
    updateDraft,
    dirty,
    saving,
    saveState,
    save,
    createEntry,
    creating,
    removeEntry,
  };
}
