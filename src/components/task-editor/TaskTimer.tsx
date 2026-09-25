"use client";

import { useEffect, useState } from "react";

import NumberFlow from "@number-flow/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TaskTimerProps {
  taskId: string;
  actualMinutes?: number | null;
  likelyDelta?: number | null;
  source?: "timer" | "focus";
}

interface TimeSummary {
  activeEntry: { id: string; startedAt: string; endedAt: string | null } | null;
  totalMinutes: number;
}

export function TaskTimer({
  taskId,
  actualMinutes,
  likelyDelta,
  source = "timer",
}: TaskTimerProps) {
  const [summary, setSummary] = useState<TimeSummary | null>(null);
  const [manualMinutes, setManualMinutes] = useState("");
  const [busy, setBusy] = useState(false);

  const loadSummary = async () => {
    const response = await fetch(`/api/time-tracking?taskId=${taskId}`);
    if (response.ok) {
      setSummary(await response.json());
    }
  };

  useEffect(() => {
    loadSummary().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const postAction = async (
    action: string,
    body: Record<string, unknown> = {}
  ) => {
    setBusy(true);
    try {
      const response = await fetch("/api/time-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, action, source, ...body }),
      });
      if (response.ok) {
        await loadSummary();
      }
    } finally {
      setBusy(false);
    }
  };

  const totalMinutes = summary?.totalMinutes ?? actualMinutes ?? 0;

  return (
    <section className="rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Time tracked</p>
          <p className="text-xs text-muted-foreground">
            <NumberFlow
              value={totalMinutes}
              suffix=" min"
              transformTiming={{ duration: 200, easing: "ease-out" }}
              respectMotionPreference
            />{" "}
            logged
            {typeof likelyDelta === "number" && (
              <>
                {" · "}
                <NumberFlow
                  value={likelyDelta}
                  prefix={likelyDelta >= 0 ? "+" : undefined}
                  suffix=" min"
                  transformTiming={{ duration: 200, easing: "ease-out" }}
                  respectMotionPreference
                />{" "}
                vs likely
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {summary?.activeEntry ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => postAction("pause")}
            >
              Pause
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => postAction("start")}
            >
              Start
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || !summary?.activeEntry}
            onClick={() => postAction("stop")}
          >
            Stop
          </Button>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          type="number"
          min="1"
          value={manualMinutes}
          onChange={(event) => setManualMinutes(event.target.value)}
          placeholder="Manual minutes"
        />
        <Button
          type="button"
          variant="outline"
          disabled={busy || !manualMinutes}
          onClick={() =>
            postAction("manual", { minutes: Number(manualMinutes) }).then(() =>
              setManualMinutes("")
            )
          }
        >
          Add
        </Button>
      </div>
    </section>
  );
}
