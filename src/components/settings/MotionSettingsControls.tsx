"use client";

import { Check } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function MotionSwitchRow({
  label,
  checked,
  onCheckedChange,
  icon,
  indented = false,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  icon?: React.ReactNode;
  indented?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-[34px] items-center gap-2 text-[14px]",
        indented &&
          "ml-1 pl-4 before:absolute before:left-1 before:top-0 before:h-4 before:w-3 before:rounded-bl-md before:border-b before:border-l before:border-[var(--border-subtle)]"
      )}
    >
      <span className="text-[var(--text-secondary)]">{label}:</span>
      {icon}
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="h-[18px] w-[32px] [&>span]:h-3.5 [&>span]:w-3.5 [&>span]:data-[state=checked]:translate-x-3.5"
      />
    </div>
  );
}

export function MotionRadioOption({
  checked,
  onClick,
  children,
}: {
  checked: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className="flex min-h-8 items-center gap-2 text-left text-[14px] text-[var(--text-primary)]"
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[var(--border-control)]",
          checked &&
            "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--surface-canvas)]"
        )}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={2.6} />}
      </span>
      <span>{children}</span>
    </button>
  );
}
