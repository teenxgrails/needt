"use client";

import { useEffect, useState } from "react";

import { Activity, AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface OperationsSnapshot {
  queues: Array<{
    name: string;
    waiting: number;
    active: number;
    failed: number;
    oldestWaitingAgeMs: number;
  }>;
  cronStates: Array<{
    id: string;
    lastStartedAt: string | null;
    lastSucceededAt: string | null;
    lastError: string | null;
  }>;
  lastSuccessfulBySource: Array<{
    id: string;
    source: string;
    finishedAt: string | null;
  }>;
  lastError: {
    errorCode: string | null;
    errorMessage: string | null;
  } | null;
}

export default function OperationsPage() {
  const [snapshot, setSnapshot] = useState<OperationsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch("/api/admin/operations", { cache: "no-store" });
    if (!response.ok) {
      setError(response.status === 403 ? "Admin access required." : "Could not load operations.");
      return;
    }
    setSnapshot((await response.json()) as OperationsSnapshot);
    setError(null);
  };

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <main className="needt-page-depth min-h-dvh px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Admin</p>
            <h1 className="mt-1 text-2xl font-semibold">Operations</h1>
          </div>
          <Button variant="outline" onClick={() => void load()}>Refresh</Button>
        </header>
        {error && (
          <div className="needt-panel-depth rounded-xl border border-[var(--border-subtle)] p-4 text-sm">
            {error}
          </div>
        )}
        {snapshot && (
          <>
            <section className="grid gap-3 md:grid-cols-2">
              {snapshot.queues.map((queue) => {
                const warning = queue.waiting > 100 || queue.oldestWaitingAgeMs > 120_000;
                return (
                  <article key={queue.name} className="needt-panel-depth rounded-xl border border-[var(--border-subtle)] p-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-medium">{queue.name}</h2>
                      {warning ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    </div>
                    <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div><dt className="text-[var(--text-muted)]">Waiting</dt><dd className="mt-1 text-lg">{queue.waiting}</dd></div>
                      <div><dt className="text-[var(--text-muted)]">Active</dt><dd className="mt-1 text-lg">{queue.active}</dd></div>
                      <div><dt className="text-[var(--text-muted)]">Failed</dt><dd className="mt-1 text-lg">{queue.failed}</dd></div>
                    </dl>
                    <p className="mt-3 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <Clock3 className="h-3.5 w-3.5" />
                      Oldest wait {Math.round(queue.oldestWaitingAgeMs / 1000)}s
                    </p>
                  </article>
                );
              })}
            </section>
            <section className="needt-panel-depth rounded-xl border border-[var(--border-subtle)] p-4">
              <h2 className="flex items-center gap-2 font-medium"><Activity className="h-4 w-4" /> Cron health</h2>
              <div className="mt-4 divide-y divide-[var(--border-subtle)]">
                {snapshot.cronStates.map((cron) => (
                  <div key={cron.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <span>{cron.id}</span>
                    <span className="text-right text-[var(--text-secondary)]">
                      {cron.lastSucceededAt ? new Date(cron.lastSucceededAt).toLocaleString() : "Never succeeded"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
