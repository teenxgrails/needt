"use client";

import { useEffect, useMemo, useState } from "react";

import { CalendarDays, Check, Clock, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Slot = { start: string; end: string };

export function BookingForm({
  slug,
  timeZone,
}: {
  slug: string;
  timeZone: string;
}) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`/api/public/booking/${encodeURIComponent(slug)}/slots`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load availability");
        return response.json() as Promise<{ slots: Slot[] }>;
      })
      .then((data) => setSlots(data.slots))
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const grouped = useMemo(() => {
    return slots.reduce<Record<string, Slot[]>>((days, slot) => {
      const key = new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
        timeZone,
      }).format(new Date(slot.start));
      (days[key] ??= []).push(slot);
      return days;
    }, {});
  }, [slots, timeZone]);

  async function submit() {
    if (!selected || !name.trim() || !email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/public/booking/${encodeURIComponent(slug)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({
            guestName: name,
            guestEmail: email,
            start: selected,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        }
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Booking failed");
      setConfirmed(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background">
          <Check className="h-5 w-5" />
        </span>
        <h2 className="mt-5 text-xl font-semibold">You’re booked</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A confirmation has been sent to {email}.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-lg">
        <div className="mb-5 flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="h-4 w-4" /> Choose a time
        </div>
        {loading ? (
          <Loader2 className="mx-auto my-16 h-5 w-5 animate-spin" />
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([day, daySlots]) => (
              <section key={day}>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {day}
                </h3>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {daySlots.map((slot) => (
                    <button
                      key={slot.start}
                      type="button"
                      onClick={() => setSelected(slot.start)}
                      className={`min-h-11 rounded-lg border px-2 text-sm transition ${
                        selected === slot.start
                          ? "border-foreground bg-foreground text-background shadow-sm"
                          : "border-border bg-background hover:border-foreground/40"
                      }`}
                    >
                      {new Intl.DateTimeFormat(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone,
                      }).format(new Date(slot.start))}
                    </button>
                  ))}
                </div>
              </section>
            ))}
            {slots.length === 0 && (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No available times in the next two weeks.
              </p>
            )}
          </div>
        )}
      </div>
      <aside className="h-fit rounded-2xl border border-border bg-card p-5 shadow-lg">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4" /> Your details
        </div>
        <div className="space-y-3">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
          />
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button
            className="h-11 w-full"
            disabled={!selected || !name.trim() || !email.trim() || submitting}
            onClick={submit}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm booking
          </Button>
          <p className="text-xs leading-5 text-muted-foreground">
            Times are shown in {timeZone}. The slot is checked again before it
            is confirmed.
          </p>
        </div>
      </aside>
    </div>
  );
}
