import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-[background-color,color,border-color,box-shadow] duration-200",
  {
    variants: {
      variant: {
        default:
          "border-cyan-300/35 bg-cyan-400/18 text-cyan-100 shadow-[0_0_12px_rgba(0,212,255,0.25)]",
        secondary: "border-slate-600/90 bg-slate-700/55 text-slate-200",
        outline: "border-slate-500 text-slate-300",
        success:
          "border-emerald-300/45 bg-emerald-500/20 text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.3)]",
        warning:
          "animate-pulse-glow border-amber-200/45 bg-amber-400/22 text-amber-100 shadow-[0_0_16px_rgba(245,158,11,0.3)]",
        danger:
          "border-rose-300/45 bg-rose-500/20 text-rose-100 shadow-[0_0_16px_rgba(244,63,94,0.28)]",
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
