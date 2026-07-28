"use client";

import { useEffect, useState } from "react";

import { CalendarCheck2, Copy, ExternalLink, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { notify } from "@/lib/notifications";

type BookingPageSummary = {
  id: string;
  title: string;
  slug: string;
  durationMinutes: number;
  isActive: boolean;
  _count: { bookings: number };
};

export function BookingSettings() {
  const [pages, setPages] = useState<BookingPageSummary[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const response = await fetch("/api/booking-pages");
    if (!response.ok) return;
    const data = (await response.json()) as { pages: BookingPageSummary[] };
    setPages(data.pages);
  };

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, []);

  async function create() {
    if (!title.trim() || !slug.trim()) return;
    setCreating(true);
    try {
      const response = await fetch("/api/booking-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not create page");
      setTitle("");
      setSlug("");
      await load();
      notify.success("Booking page created");
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Could not create page"
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Booking links</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Share live availability without exposing private calendar details.
        </p>
      </div>
      <div className="needt-panel-depth rounded-xl border border-[var(--border-subtle)] p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!slug) {
                setSlug(
                  event.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, "")
                );
              }
            }}
            placeholder="30-minute intro"
          />
          <Input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="your-link"
          />
          <Button
            className="min-h-11"
            disabled={creating || !title.trim() || slug.trim().length < 3}
            onClick={() => void create()}
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create
          </Button>
        </div>
      </div>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <div className="space-y-2">
          {pages.map((page) => {
            const path = `/book/${page.slug}`;
            return (
              <article
                key={page.id}
                className="needt-panel-depth flex min-h-16 items-center gap-3 rounded-xl border border-[var(--border-subtle)] px-4"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--surface-hover)]">
                  <CalendarCheck2 className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{page.title}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {page.durationMinutes} min · {page._count.bookings} bookings
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      `${window.location.origin}${path}`
                    );
                    notify.success("Booking link copied");
                  }}
                  aria-label="Copy booking link"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" asChild>
                  <a href={path} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    <span className="sr-only">Open booking page</span>
                  </a>
                </Button>
              </article>
            );
          })}
          {pages.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">
              No booking links yet.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
