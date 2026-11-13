"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Delete, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { Logo } from "@/app/components/Logo";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { cx } from "@/app/lib/cn";

function readError(data: unknown): string | null {
  if (data && typeof data === "object" && "error" in data) {
    return typeof data.error === "string" ? data.error : null;
  }
  return null;
}

export function PinLock({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const pinRef = useRef("");

  const setPinValue = useCallback((value: string) => {
    pinRef.current = value;
    setPin(value);
  }, []);

  const submit = useCallback(
    async (value: string) => {
      if (submitting || value.length !== 4) return;

      setSubmitting(true);
      setError(null);

      try {
        const response = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: value, remember }),
        });
        const data: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          setError(readError(data) ?? "The journal could not be unlocked.");
          setPinValue("");
          setShake(true);
          window.setTimeout(() => setShake(false), 400);
          return;
        }

        onUnlock();
      } catch {
        setError("The journal could not be reached. Check your connection.");
        setPinValue("");
        setShake(true);
        window.setTimeout(() => setShake(false), 400);
      } finally {
        setSubmitting(false);
      }
    },
    [onUnlock, remember, setPinValue, submitting],
  );

  const addDigit = useCallback(
    (digit: string) => {
      if (submitting) return;
      const current = pinRef.current;
      if (current.length >= 4) return;

      const next = current + digit;
      setError(null);
      setPinValue(next);

      if (next.length === 4) void submit(next);
    },
    [setPinValue, submit, submitting],
  );

  const deleteDigit = useCallback(() => {
    if (submitting) return;
    setPinValue(pinRef.current.slice(0, -1));
    setError(null);
  }, [setPinValue, submitting]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (/^\d$/u.test(event.key)) {
        event.preventDefault();
        addDigit(event.key);
      } else if (event.key === "Backspace") {
        event.preventDefault();
        deleteDigit();
      } else if (event.key === "Escape") {
        setPinValue("");
        setError(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addDigit, deleteDigit, setPinValue]);

  return (
    <main className="app-bg relative grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <div className="absolute right-3 top-3 z-10 safe-top">
        <ThemeToggle />
      </div>

      <section className="hidden flex-col justify-between border-r border-border/70 p-10 lg:flex xl:p-14">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <p className="text-sm font-semibold tracking-tight">Journal</p>
            <p className="mono-label mt-0.5 text-[10px]">Private notes</p>
          </div>
        </div>

        <div className="max-w-md">
          <p className="mono-label">A quiet place</p>
          <p className="mt-4 font-serif text-4xl leading-[1.18] tracking-[-0.01em] text-balance xl:text-[2.75rem]">
            For the days that matter, and the ones you almost forgot.
          </p>
          <p className="mt-6 max-w-sm text-sm leading-6 text-muted-foreground">
            Write without an audience. Tag what you want to remember. Return
            when you need the thread again.
          </p>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <ShieldCheck
            className="size-4"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span className="mono-label text-[10px]">Locked with your PIN</span>
        </div>
      </section>

      <section className="flex min-h-dvh flex-col justify-center px-5 py-12 sm:px-8">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo />
            <div>
              <p className="text-sm font-semibold tracking-tight">Journal</p>
              <p className="mono-label mt-0.5 text-[10px]">Private notes</p>
            </div>
          </div>

          <div className="surface rounded-panel p-6 shadow-lift sm:p-8">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                <LockKeyhole
                  className="size-4"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </span>
              <div>
                <h1 className="text-base font-semibold tracking-tight">
                  Enter your PIN
                </h1>
                <p className="text-xs text-muted-foreground">
                  Four digits unlock this journal.
                </p>
              </div>
            </div>

            <div
              className={cx(
                "mt-7 flex justify-center gap-3",
                shake && "animate-shake",
              )}
            >
              {[0, 1, 2, 3].map((index) => (
                <span
                  key={index}
                  aria-hidden="true"
                  className={cx(
                    "size-3 rounded-full border transition-all duration-200",
                    pin.length > index
                      ? "border-primary bg-primary"
                      : "border-border-strong bg-transparent",
                  )}
                />
              ))}
            </div>
            <p className="sr-only" aria-live="polite">
              {pin.length} of 4 digits entered
            </p>

            <div className="mt-4 min-h-6 text-center">
              {error && (
                <p role="alert" className="text-xs text-destructive">
                  {error}
                </p>
              )}
            </div>

            <div
              className="mt-2 grid grid-cols-3 gap-2.5"
              aria-label="PIN keypad"
            >
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={submitting}
                  onClick={() => addDigit(digit)}
                  className="h-14 rounded-xl border border-transparent bg-muted text-xl font-medium tabular-nums text-foreground transition-colors duration-200 hover:border-border-strong hover:bg-surface-hover active:scale-[0.98] disabled:opacity-50"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setPinValue("");
                  setError(null);
                }}
                className="mono-label h-14 rounded-xl bg-muted text-foreground/70 transition-colors duration-200 hover:bg-surface-hover hover:text-foreground active:scale-[0.98] disabled:opacity-50"
              >
                Clear
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => addDigit("0")}
                className="h-14 rounded-xl bg-muted text-xl font-medium tabular-nums text-foreground transition-colors duration-200 hover:bg-surface-hover active:scale-[0.98] disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={deleteDigit}
                aria-label="Delete last digit"
                className="grid h-14 place-items-center rounded-xl bg-muted text-foreground transition-colors duration-200 hover:bg-surface-hover active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2
                    className="size-5 animate-spin"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                ) : (
                  <Delete
                    className="size-5"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                )}
              </button>
            </div>

            <label className="mt-5 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="size-4 rounded border-border"
              />
              Remember this device for 30 days
            </label>
          </div>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Type with your keyboard or tap the keypad.
          </p>
        </div>
      </section>
    </main>
  );
}
