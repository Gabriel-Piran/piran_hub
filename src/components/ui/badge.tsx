import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-[#c9a84c]/40 bg-[#c9a84c]/10 text-[#c9a84c]",
        ads: "border-sky-500/40 bg-sky-500/10 text-sky-400",
        indicacoes: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
        muted: "border-white/10 bg-white/5 text-white/60",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
