import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-transparent text-sm font-medium transition-[background-color,color,border-color,box-shadow,transform,filter] duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent-subtle)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)] active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(180deg,var(--accent),var(--accent-muted))] text-white shadow-[0_10px_24px_rgba(79,70,229,0.32)] hover:brightness-110 hover:shadow-[0_12px_30px_rgba(79,70,229,0.38)]",
        secondary:
          "border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
        outline:
          "border-[var(--border)] bg-transparent text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
        ghost:
          "text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
        destructive:
          "border-[color:rgba(239,68,68,0.16)] bg-[color:rgba(239,68,68,0.14)] text-[#fca5a5] hover:bg-[color:rgba(239,68,68,0.2)] hover:text-[#fecaca]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
