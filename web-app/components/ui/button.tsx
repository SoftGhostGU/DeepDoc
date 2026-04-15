import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent text-sm font-medium tracking-wide transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0a1628] active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-cyan-400 text-slate-950 shadow-[0_0_0_1px_rgba(0,212,255,0.3)] hover:bg-cyan-300 hover:shadow-[0_0_22px_rgba(0,212,255,0.35)]",
        secondary:
          "border-slate-700 bg-[#142238] text-slate-100 hover:border-slate-500 hover:bg-[#1a2c47]",
        outline:
          "border-slate-600 bg-[#0f1d32]/85 text-slate-100 hover:border-cyan-300/60 hover:text-cyan-100",
        ghost: "text-slate-300 hover:bg-cyan-400/10 hover:text-cyan-100",
        destructive:
          "bg-rose-600 text-rose-50 shadow-[0_0_0_1px_rgba(244,63,94,0.35)] hover:bg-rose-500 hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]",
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
