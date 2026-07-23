"use client";

import { useState } from "react";
import { Bug } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getAppVersion } from "@/lib/version";

export function ReportBugDialog({ mobile = false }: { mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSubmitting(true);
    const form = new FormData(event.currentTarget);
    form.set("route", window.location.pathname + window.location.hash);
    form.set("appVersion", getAppVersion());
    form.set("viewport", `${window.innerWidth}x${window.innerHeight}`);
    form.set("theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
    form.set("browser", navigator.userAgent);
    try {
      const response = await fetch("/api/bug-reports", { method: "POST", body: form });
      if (!response.ok) throw new Error("Report failed");
      toast.success("Bug report sent. Thank you."); setOpen(false);
    } catch { toast.error("Could not send the report. Please try again."); }
    finally { setSubmitting(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="destructive" className={mobile ? "h-12 w-full" : "mt-4 w-full justify-start"}><Bug /> Report a bug</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Report a bug</DialogTitle><DialogDescription>Tell us what happened. Page content and logs are never attached automatically.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Input name="title" required maxLength={160} placeholder="Short title" />
          <textarea name="description" required placeholder="What happened?" className="min-h-24 w-full rounded-[var(--control-radius)] border border-[var(--control-border)] bg-[var(--control-bg)] p-3 text-sm outline-none focus:border-[var(--control-border-focus)]" />
          <textarea name="reproductionSteps" placeholder="Steps to reproduce" className="min-h-20 w-full rounded-[var(--control-radius)] border border-[var(--control-border)] bg-[var(--control-bg)] p-3 text-sm outline-none" />
          <div className="grid gap-3 sm:grid-cols-2"><textarea name="expectedBehavior" placeholder="Expected" className="min-h-20 rounded-[var(--control-radius)] border border-[var(--control-border)] bg-[var(--control-bg)] p-3 text-sm outline-none" /><textarea name="actualBehavior" placeholder="Actual" className="min-h-20 rounded-[var(--control-radius)] border border-[var(--control-border)] bg-[var(--control-bg)] p-3 text-sm outline-none" /></div>
          <div className="grid gap-3 sm:grid-cols-2"><select name="severity" defaultValue="MEDIUM" className="h-[30px] rounded-[var(--control-radius)] border border-[var(--control-border)] bg-[var(--control-bg)] px-2 text-sm"><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select><Input name="attachment" type="file" accept="image/*,.txt,.log" /></div>
          <p className="text-[11px] text-[var(--text-muted)]">Attached automatically: current route, app version, viewport, theme, browser and timestamp.</p>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? "Sending…" : "Send report"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
