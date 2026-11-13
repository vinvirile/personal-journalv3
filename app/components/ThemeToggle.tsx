"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/components/ThemeProvider";
import { cx } from "@/app/lib/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
      className={cx("icon-button", className)}
    >
      {isDark ? (
        <Sun className="size-5" strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <Moon className="size-5" strokeWidth={1.75} aria-hidden="true" />
      )}
    </button>
  );
}
