"use client";

import { NeedtPicker } from "@/components/ui/needt-picker";

const TIMES = Array.from({ length: 96 }, (_, index) => {
  const hours = Math.floor(index / 4);
  const minutes = (index % 4) * 15;
  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  return { value, label: new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, hours, minutes)) };
});

export function TimePicker({ label, value, onValueChange }: { label: string; value: string; onValueChange: (value: string) => void }) {
  return <NeedtPicker label={label} value={value} valueLabel={TIMES.find((time) => time.value === value)?.label || value} options={TIMES} onValueChange={onValueChange} searchPlaceholder="Find a time" />;
}
