import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-9 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-1 text-sm text-[var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--foreground-dim)] focus-visible:outline-hidden focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-subtle)] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
