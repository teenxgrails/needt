import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AnimatedCircularProgressBarProps {
  max?: number;
  min?: number;
  value: number;
  gaugePrimaryColor: string;
  gaugeSecondaryColor: string;
  className?: string;
  children?: ReactNode;
  ariaLabel?: string;
}

export function AnimatedCircularProgressBar({
  max = 100,
  min = 0,
  value = 0,
  gaugePrimaryColor,
  gaugeSecondaryColor,
  className,
  children,
  ariaLabel = "Progress",
}: AnimatedCircularProgressBarProps) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const range = Math.max(1, max - min);
  const progress = Math.min(1, Math.max(0, (value - min) / range));
  const currentPercent = progress * 100;

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.min(max, Math.max(min, value))}
      className={cn(
        "relative grid size-40 place-items-center text-2xl font-semibold",
        className
      )}
      style={{ transform: "translateZ(0)" }}
    >
      <svg
        aria-hidden="true"
        fill="none"
        className="absolute inset-0 size-full -rotate-90"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={gaugeSecondaryColor}
          strokeWidth="7"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={gaugePrimaryColor}
          strokeWidth="7"
          strokeLinecap="round"
          style={
            {
              strokeDasharray: circumference,
              strokeDashoffset: circumference * (1 - currentPercent / 100),
              transition: "stroke-dashoffset 1s linear, stroke 180ms ease",
              transformOrigin: "50% 50%",
            } as CSSProperties
          }
        />
      </svg>
      <div className="relative z-[1]">
        {children ?? Math.round(currentPercent)}
      </div>
    </div>
  );
}
