const JOURNAL_TIME_ZONE = "America/Chicago";

function asDate(strictDate: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(strictDate);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
}

export function todayISODate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JOURNAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function formatEntryDate(strictDate: string): string {
  const date = asDate(strictDate);
  if (!date) return strictDate;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatLongDate(strictDate: string): string {
  const date = asDate(strictDate);
  if (!date) return strictDate;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatMonthLabel(monthKey: string): string {
  const date = asDate(`${monthKey}-01`);
  if (!date) return monthKey;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function monthKey(strictDate: string): string {
  return strictDate.slice(0, 7);
}

export function formatClock(isoDate?: string): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: JOURNAL_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatUpdated(isoDate?: string): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";

  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: JOURNAL_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function isInDateRange(
  strictDate: string,
  start: string,
  end: string,
): boolean {
  if (start && strictDate < start) return false;
  if (end && strictDate > end) return false;
  return true;
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/u).length;
}

export function readingMinutes(words: number): number {
  if (words === 0) return 0;
  return Math.max(1, Math.round(words / 220));
}

export function parseTags(tags: string): string[] {
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function normaliseTags(tags: string): string {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of parseTags(tags)) {
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }
  return result.join(", ");
}
