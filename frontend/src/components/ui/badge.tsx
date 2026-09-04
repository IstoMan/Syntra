import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none font-mono",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-red-500/40 bg-red-500/15 text-red-300",
        outline: "text-foreground border-border",
        critical: "border-red-500/50 bg-red-500/20 text-red-300 font-bold",
        high: "border-rose-500/50 bg-rose-500/20 text-rose-300 font-bold",
        medium: "border-amber-500/50 bg-amber-500/20 text-amber-300 font-bold",
        low: "border-emerald-500/40 bg-emerald-500/20 text-emerald-300 font-bold",
        cyber: "border-sky-500/40 bg-sky-500/15 text-sky-300 font-bold",
        purple: "border-purple-500/40 bg-purple-500/15 text-purple-300 font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dotColor?: string;
  pulse?: boolean;
}

function Badge({ className, variant, dotColor, pulse, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dotColor && (
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor, pulse && "animate-ping")} />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
