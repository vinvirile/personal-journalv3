import { BookOpen } from "lucide-react";
import { cx } from "@/app/lib/cn";

export function Logo({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-on-primary shadow-soft",
        className,
      )}
    >
      <BookOpen
        className={cx("size-5", iconClassName)}
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </span>
  );
}
