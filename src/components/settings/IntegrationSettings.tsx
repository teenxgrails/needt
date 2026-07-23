"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settings";

type CatalogItem = {
  slug: string;
  name: string;
  description: string;
  category: string;
  iconUrl?: string;
  native?: boolean;
  configured: boolean;
};
type Connection = { id: string; provider: string; toolkit: string; status: string };

const CATEGORY_LABELS: Record<string, string> = {
  all: "All", calendar: "Calendar", tasks: "Tasks", notes: "Notes",
  communication: "Communication", files: "Files", developer: "Developer", ai: "AI",
};

export function IntegrationSettings() {
  const { accounts } = useSettingsStore();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [connecting, setConnecting] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch("/api/integrations/catalog");
    if (!response.ok) return;
    const data = (await response.json()) as { catalog: CatalogItem[]; connections: Connection[] };
    setCatalog(data.catalog); setConnections(data.connections);
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => catalog.filter((item) => {
    const matchesCategory = category === "all" || item.category === category;
    const needle = query.trim().toLowerCase();
    return matchesCategory && (!needle || `${item.name} ${item.description}`.toLowerCase().includes(needle));
  }), [catalog, category, query]);
  const categories = ["all", ...new Set(catalog.map((item) => item.category))];

  const nativeConnected = (slug: string) => {
    if (slug === "google-calendar") return accounts.some((account) => account.provider === "GOOGLE");
    if (slug === "outlook-calendar") return accounts.some((account) => account.provider === "OUTLOOK");
    if (slug === "icloud-calendar") return accounts.some((account) => account.provider === "CALDAV");
    return false;
  };
  const connectionFor = (slug: string) => connections.find((connection) => connection.toolkit.toLowerCase() === slug.toLowerCase() && connection.status === "CONNECTED");

  const act = async (item: CatalogItem) => {
    if (item.native) {
      window.location.hash = item.slug === "needt-api" ? "api" : "calendars";
      return;
    }
    const connection = connectionFor(item.slug);
    if (connection) {
      const response = await fetch("/api/integrations/disconnect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: connection.id }) });
      if (response.ok) { toast.success(`${item.name} disconnected`); await load(); }
      return;
    }
    setConnecting(item.slug);
    try {
      const response = await fetch("/api/integrations/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toolkit: item.slug }) });
      const result = (await response.json()) as { redirectUrl?: string; error?: string };
      if (!response.ok || !result.redirectUrl) throw new Error(result.error || "Connection failed");
      window.location.assign(result.redirectUrl);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not connect"); }
    finally { setConnecting(null); }
  };

  return (
    <div className="space-y-6">
      <div className="max-w-xl">
        <h2 className="text-lg font-semibold">Connect your tools</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Native calendars stay first-class. Other apps use a permission-limited connector and AI writes always require confirmation.</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search integrations" className="pl-9" /></div>
        <div className="flex gap-1 overflow-x-auto">{categories.map((item) => <Button key={item} size="sm" variant={category === item ? "secondary" : "ghost"} onClick={() => setCategory(item)}>{CATEGORY_LABELS[item] || item}</Button>)}</div>
      </div>
      <div className="grid gap-x-8 gap-y-2 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => {
          const connected = item.native ? nativeConnected(item.slug) : Boolean(connectionFor(item.slug));
          return (
            <article key={item.slug} className="flex min-h-[92px] items-center gap-3 py-3">
              <div className="flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-[10px] bg-[var(--surface-raised)] text-sm font-semibold">{item.iconUrl ? <Image unoptimized src={item.iconUrl} alt="" width={32} height={32} className="h-8 w-8 object-contain" /> : item.name.slice(0, 2).toUpperCase()}</div>
              <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-medium">{item.name}</h3><p className="mt-0.5 line-clamp-2 text-xs leading-4 text-[var(--text-muted)]">{item.description}</p>{connected && <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-[var(--color-success)]"><Check className="h-3 w-3" /> Connected</span>}</div>
              <Button size="sm" variant="outline" disabled={!item.configured || connecting === item.slug} className={cn(!item.configured && "text-[var(--text-disabled)]")} onClick={() => void act(item)}>{!item.configured ? "Unavailable" : connected ? "Manage" : connecting === item.slug ? "Connecting…" : "Connect"}</Button>
            </article>
          );
        })}
      </div>
      {filtered.length === 0 && <div className="py-16 text-center text-sm text-[var(--text-muted)]">No matching integrations.</div>}
    </div>
  );
}
