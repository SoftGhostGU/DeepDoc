import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-[background-color,color,border-color,box-shadow] duration-200",
  {
    variants: {
      variant: {
        default:
          "border-[color:rgba(99,102,241,0.18)] bg-[var(--accent-subtle)] text-[var(--accent-hover)]",
        secondary:
          "border-[var(--border-subtle)] bg-[var(--surface-hover)] text-[var(--foreground-muted)]",
        outline: "border-[var(--border)] text-[var(--foreground-muted)]",
        success:
          "border-[color:rgba(34,197,94,0.16)] bg-[color:rgba(34,197,94,0.1)] text-[#86efac]",
        warning:
          "border-[color:rgba(234,179,8,0.16)] bg-[color:rgba(234,179,8,0.1)] text-[#fde047]",
        danger:
          "border-[color:rgba(239,68,68,0.16)] bg-[color:rgba(239,68,68,0.1)] text-[#fca5a5]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
