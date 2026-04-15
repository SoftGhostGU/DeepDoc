import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
        <input
          ref={ref}
          type={type}
          className={cn(
            "flex h-9 w-full rounded-md border border-slate-600 bg-[#0c1b31] px-3 py-1 text-sm text-slate-100 shadow-[inset_0_1px_0_rgba(148,163,184,0.07)] transition-[border-color,box-shadow] duration-150 placeholder:text-slate-500 focus-visible:outline-hidden focus-visible:border-cyan-300/70 focus-visible:ring-2 focus-visible:ring-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        />
    );
  },
);
Input.displayName = "Input";

export { Input };
