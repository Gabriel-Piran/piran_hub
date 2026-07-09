"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
}

function Switch({ checked, onCheckedChange, id, className, disabled }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-white/10 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-[#c9a84c]" : "bg-white/10",
        className
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-[#0f0f0f] transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

export { Switch };
