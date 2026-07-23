"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Placeholder } from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ChevronLeft, Clock3, LockKeyhole, MoreHorizontal, Redo2, Sparkles, Star, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { PageDetail } from "./page-types";

type SaveState = "saved" | "saving" | "failed";

function pageHtml(page: PageDetail) {
  const first = page.blocks.find((block) => block.type === "PARAGRAPH");
  if (!first || !first.content || typeof first.content !== "object") return "<p></p>";
  const content = first.content as { html?: unknown; text?: unknown };
  if (typeof content.html === "string") return content.html;
  if (typeof content.text === "string") return `<p>${content.text}</p>`;
  return "<p></p>";
}

export function PageWorkspace({ pageId }: { pageId: string }) {
  const router = useRouter();
  const [page, setPage] = useState<PageDetail | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revision = useRef(0);

  const saveBlocks = useCallback(async (html: string, requestRevision: number) => {
    setSaveState("saving");
    try {
      const response = await fetch(`/api/pages/${pageId}/blocks`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: [{ type: "PARAGRAPH", content: { html }, position: 1024 }] }),
      });
      if (!response.ok) throw new Error("Save failed");
      if (revision.current === requestRevision) setSaveState("saved");
      localStorage.removeItem(`needt-page-draft:${pageId}`);
      window.dispatchEvent(new Event("pages-changed"));
    } catch {
      localStorage.setItem(`needt-page-draft:${pageId}`, html);
      if (revision.current === requestRevision) setSaveState("failed");
    }
  }, [pageId]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } }), Placeholder.configure({ placeholder: "Write anything, or type / for commands…" })],
    content: "<p></p>",
    editorProps: { attributes: { class: "needt-page-editor min-h-[55vh] cursor-text outline-none", "aria-label": "Page document" } },
    onUpdate: ({ editor: current }) => {
      const html = current.getHTML();
      revision.current += 1;
      const requestRevision = revision.current;
      localStorage.setItem(`needt-page-draft:${pageId}`, html);
      setSaveState("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void saveBlocks(html, requestRevision), 650);
    },
  });

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/pages/${pageId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Page not found");
        return response.json() as Promise<{ page: PageDetail }>;
      })
      .then(({ page: loaded }) => {
        if (cancelled) return;
        setPage(loaded);
        const draft = localStorage.getItem(`needt-page-draft:${pageId}`);
        editor?.commands.setContent(draft || pageHtml(loaded), { emitUpdate: false });
        if (draft) setSaveState("failed");
      })
      .catch(() => router.replace("/pages"));
    return () => { cancelled = true; };
  }, [editor, pageId, router]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (saveState !== "saved") event.preventDefault(); };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [saveState]);

  const patchPage = async (values: Record<string, unknown>) => {
    setPage((current) => current ? ({ ...current, ...values } as PageDetail) : current);
    const response = await fetch(`/api/pages/${pageId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    if (!response.ok) toast.error("Could not update page");
    window.dispatchEvent(new Event("pages-changed"));
  };

  if (!page) return <div className="mx-auto max-w-4xl animate-pulse px-8 py-16"><div className="mb-8 h-9 w-2/3 rounded bg-[var(--surface-raised)]" /><div className="h-64 rounded bg-[var(--surface-raised)]" /></div>;
  if (page.database) return <DatabaseWorkspace page={page} onPatch={patchPage} />;

  return (
    <div className="min-h-dvh bg-[var(--app-bg)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-20 flex h-11 items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--app-bg)] px-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/pages")} aria-label="Back to pages"><ChevronLeft /></Button>
        <span className="min-w-0 flex-1 truncate text-sm">{page.icon} {page.title}</span>
        <span className="text-[11px] text-[var(--text-muted)]">{saveState === "saving" ? "Saving…" : saveState === "failed" ? "Failed · draft kept" : "Saved"}</span>
        <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} aria-label="Undo"><Undo2 /></Button>
        <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} aria-label="Redo"><Redo2 /></Button>
        <Button variant="ghost" size="icon" onClick={() => void patchPage({ isFavorite: !page.isFavorite })} aria-label="Favorite"><Star className={page.isFavorite ? "fill-current text-amber-400" : ""} /></Button>
        <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]"><LockKeyhole className="h-3.5 w-3.5" /><Switch checked={page.isPrivate} onCheckedChange={(checked) => void patchPage({ isPrivate: checked })} /></label>
        <Button variant="ghost" size="icon" aria-label="Page options"><MoreHorizontal /></Button>
      </header>
      <main className="mx-auto max-w-[900px] px-7 pb-32 pt-16 sm:px-12 lg:px-20">
        <input value={page.title} onChange={(event) => setPage({ ...page, title: event.target.value })} onBlur={() => void patchPage({ title: page.title })} className="mb-8 w-full bg-transparent text-4xl font-semibold tracking-[-0.045em] outline-none placeholder:text-[var(--text-disabled)]" placeholder="Untitled" />
        <div className="mb-4 flex items-center gap-2 text-[11px] text-[var(--text-muted)]"><Clock3 className="h-3.5 w-3.5" /> Edited just now{page.blocks.some((block) => block.createdBy === "AI") && <span className="ml-2 flex items-center gap-1"><Sparkles className="h-3 w-3" /> Written with AI</span>}</div>
        <EditorContent editor={editor} />
      </main>
    </div>
  );
}

function DatabaseWorkspace({ page, onPatch }: { page: PageDetail; onPatch: (values: Record<string, unknown>) => Promise<void> }) {
  const [view, setView] = useState("TABLE");
  const [title, setTitle] = useState(page.title);
  const database = page.database as unknown as { records?: Array<{ id: string; page: { title: string } }> };
  const views = ["TABLE", "BOARD", "LIST", "TIMELINE", "CALENDAR", "GALLERY"];
  return (
    <div className="min-h-dvh bg-[var(--app-bg)] p-6 text-[var(--text-primary)] lg:p-10">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() => {
          if (title !== page.title) void onPatch({ title });
        }}
        className="mb-7 w-full bg-transparent text-3xl font-semibold outline-none"
      />
      <div className="mb-5 flex flex-wrap items-center gap-1 border-b border-[var(--border-subtle)] pb-2">{views.map((item) => <Button key={item} variant={view === item ? "secondary" : "ghost"} size="sm" onClick={() => setView(item)}>{item[0]}{item.slice(1).toLowerCase()}</Button>)}</div>
      {view === "TABLE" ? (
        <div className="overflow-hidden rounded-[var(--panel-radius)] border border-[var(--border-subtle)]">
          <div className="grid grid-cols-[2fr_1fr_1fr] bg-[var(--surface-raised)] text-xs text-[var(--text-muted)]"><div className="p-2.5">Name</div><div className="p-2.5">Status</div><div className="p-2.5">Date</div></div>
          {(database.records || []).map((record) => <div key={record.id} className="grid grid-cols-[2fr_1fr_1fr] border-t border-[var(--border-subtle)] text-sm"><div className="p-2.5">{record.page.title}</div><div className="p-2.5 text-[var(--text-muted)]">—</div><div className="p-2.5 text-[var(--text-muted)]">—</div></div>)}
        </div>
      ) : <div className="min-h-[420px] rounded-[var(--panel-radius)] bg-[var(--surface-raised)] p-8 text-sm text-[var(--text-muted)]">{view[0]}{view.slice(1).toLowerCase()} view uses this database’s same records. Configure its grouping, dates and visible properties here.</div>}
    </div>
  );
}
