"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cx } from "@/app/lib/cn";

export type ToastTone = "success" | "error" | "info";

export type ToastMessage = {
  id: number;
  message: string;
  tone: ToastTone;
};

const toneStyles: Record<ToastTone, string> = {
  success: "text-secondary",
  error: "text-destructive",
  info: "text-accent",
};

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastMessage | null;
  onDismiss: () => void;
}) {
  if (!toast) return null;

  const Icon =
    toast.tone === "success"
      ? CheckCircle2
      : toast.tone === "error"
        ? AlertCircle
        : Info;

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-rise fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))]
        left-1/2 z-[60] flex w-[min(92vw,26rem)] -translate-x-1/2 items-center
        gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm
        text-card-foreground shadow-lift"
    >
      <Icon
        className={cx("size-5 shrink-0", toneStyles[toast.tone])}
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <p className="min-w-0 flex-1 leading-5">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="icon-button -my-2 -mr-2 size-11 rounded-lg"
      >
        <X className="size-4" strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}
