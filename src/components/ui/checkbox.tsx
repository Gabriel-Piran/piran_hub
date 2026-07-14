"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <span
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onCheckedChange(!checked);
        }}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            onCheckedChange(!checked);
          }
        }}
        className={cn(
          "flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors",
          checked
            ? "border-[#c9a84c] bg-[#c9a84c] text-[#0f0f0f]"
            : "border-white/30 bg-transparent hover:border-white/50",
          className
        )}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
        <input ref={ref} type="checkbox" checked={checked} readOnly className="sr-only" {...props} />
      </span>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
