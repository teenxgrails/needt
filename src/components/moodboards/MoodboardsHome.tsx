"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Image as ImageIcon, Plus, Shapes } from "lucide-react";

import { Button } from "@/components/ui/button";

import { newDate } from "@/lib/date-utils";

import type { MoodboardSummary } from "./moodboard-types";

export function MoodboardsHome() {
  const [moodboards, setMoodboards] = useState<MoodboardSummary[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    void fetch("/api/moodboards")
      .then((response) => (response.ok ? response.json() : { moodboards: [] }))
      .then((data: { moodboards?: MoodboardSummary[] }) =>
        setMoodboards(Array.isArray(data.moodboards) ? data.moodboards : [])
      )
      .catch(() => setMoodboards([]));
  }, []);

  const createMoodboard = async () => {
    setIsCreating(true);
    try {
      const response = await fetch("/api/moodboards", { method: "POST" });
      if (!response.ok) return;
      const { moodboard } = (await response.json()) as {
        moodboard?: MoodboardSummary;
      };
      if (moodboard) {
        window.location.assign(`/moodboards/${moodboard.id}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--surface-canvas)] px-4 py-7 text-[var(--text-primary)] sm:px-6 sm:py-10 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <ImageIcon className="h-3.5 w-3.5" /> Visual workspace
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.04em]">
              Moodboards
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[var(--text-secondary)]">
              Collect references, sketch ideas and shape a direction together.
            </p>
          </div>
          <Button
            className="min-h-11 px-3"
            disabled={isCreating}
            onClick={() => void createMoodboard()}
          >
            <Plus /> New moodboard
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            className="group min-h-40 rounded-[var(--panel-radius)] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 text-left transition-colors hover:bg-[var(--menu-item-hover)]"
            disabled={isCreating}
            onClick={() => void createMoodboard()}
            type="button"
          >
            <Plus className="mb-8 h-5 w-5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
            <div className="text-sm font-medium">Blank moodboard</div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              Start with a clean infinite canvas.
            </div>
          </button>
          {moodboards.map((moodboard) => (
            <Link
              className="group min-h-40 rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 transition-colors hover:bg-[var(--menu-item-hover)]"
              href={`/moodboards/${moodboard.id}`}
              key={moodboard.id}
            >
              <Shapes className="mb-8 h-5 w-5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
              <div className="truncate text-sm font-medium">
                {moodboard.title}
              </div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">
                Edited {newDate(moodboard.updatedAt).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
