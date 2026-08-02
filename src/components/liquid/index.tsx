import * as React from "react";

import { cn } from "@/lib/utils";

type GlassTone = "default" | "strong" | "subtle";
type GlowTone = "blue" | "violet" | "magenta" | "teal";

function glassClass(tone: GlassTone) {
  if (tone === "strong") return "glass--strong";
  if (tone === "subtle") return "glass--subtle";
  return "glass";
}

export function AmbientBackdrop({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("ambient-backdrop", className)} />
  );
}

export function GlassPanel({
  tone = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: GlassTone }) {
  return <section className={cn(glassClass(tone), className)} {...props} />;
}

export function GlassCard({
  tone = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: GlassTone }) {
  return <div className={cn(glassClass(tone), "p-5", className)} {...props} />;
}

export function GlowRing({
  tone = "violet",
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement> & { tone?: GlowTone }) {
  return (
    <div
      className={cn(
        "grid place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-control)] p-2",
        `glow-${tone}`,
        className
      )}
    >
      {children}
    </div>
  );
}

export function StatBlock({
  label,
  value,
  detail,
  tone = "violet",
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  tone?: GlowTone;
}) {
  return (
    <GlassCard tone="subtle" className={cn("liquid-press", `glow-${tone}`)}>
      <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
        {label}
      </div>
      <div className="stat-numeral mt-2 text-4xl text-[var(--text-primary)]">
        {value}
      </div>
      {detail && (
        <div className="mt-2 text-sm text-[var(--text-secondary)]">
          {detail}
        </div>
      )}
    </GlassCard>
  );
}

export function PrimaryButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "liquid-press liquid-shimmer inline-flex h-10 items-center justify-center gap-2 rounded-[var(--control-radius)] border border-[var(--button-primary-border)] bg-[var(--button-primary-bg)] px-5 text-sm font-semibold text-[var(--button-primary-fg)] disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
