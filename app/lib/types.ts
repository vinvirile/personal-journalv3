export type Entry = {
  id: string;
  title: string;
  content: string;
  tags: string;
  strict_date: string;
  created_at: string;
  updated_at?: string;
};

export type Draft = {
  title: string;
  content: string;
  tags: string;
};

export type JournalFilters = {
  start: string;
  end: string;
  tag: string | null;
};

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export type TagCount = {
  tag: string;
  count: number;
};

export const EMPTY_DRAFT: Draft = {
  title: "",
  content: "",
  tags: "",
};
