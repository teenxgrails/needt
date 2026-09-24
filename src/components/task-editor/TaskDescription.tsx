"use client";

import { taskDescriptionToHtml } from "@/lib/task-description-format";
import { cn } from "@/lib/utils";

interface TaskDescriptionProps {
  value: string;
  className?: string;
  compact?: boolean;
}

export function TaskDescription({
  value,
  className,
  compact = false,
}: TaskDescriptionProps) {
  const html = taskDescriptionToHtml(value);
  if (!html) return null;

  return (
    <div
      className={cn(
        "task-rich-text",
        compact && "task-rich-text-compact",
        className
      )}
      // The conversion helper sanitizes both legacy text and stored rich HTML.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
