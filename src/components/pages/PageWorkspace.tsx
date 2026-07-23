"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { Extension, type JSONContent } from "@tiptap/core";
import ImageExtension from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Placeholder from "@tiptap/extension-placeholder";
import { Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bell,
  Bookmark,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  Clock3,
  Code2,
  Columns3,
  File,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Image,
  LayoutTemplate,
  Link2,
  List,
  ListOrdered,
  LockKeyhole,
  MessageSquare,
  MessageSquareQuote,
  Minus,
  MoreHorizontal,
  Pilcrow,
  Quote,
  Redo2,
  Sparkles,
  Star,
  Table2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import { DatabaseWorkspace } from "@/components/pages/DatabaseWorkspace";
import { PageBlockNode } from "@/components/pages/PageBlockNode";
import {
  documentFromPageBlocks,
  legacyPageHtml,
  pageBlocksFromDocument,
} from "@/components/pages/page-document";
import type { PageDetail } from "@/components/pages/page-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/utils";

type SaveState = "saved" | "saving" | "failed";
type BasicCommand =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bullet"
  | "ordered"
  | "checklist"
  | "quote"
  | "code"
  | "divider";
type SpecialKind =
  | "CALLOUT"
  | "TOGGLE"
  | "LINK"
  | "BOOKMARK"
  | "IMAGE"
  | "FILE"
  | "TABLE"
  | "COLUMNS"
  | "PAGE_MENTION"
  | "DATE_MENTION"
  | "FORM";
type PageCommand = BasicCommand | SpecialKind;
type PageComment = {
  id: string;
  body: string;
  resolvedAt: string | null;
  createdAt: string;
};
type PageTemplate = {
  id: string;
  name: string;
  description: string | null;
};
type PageProposal = {
  id: string;
  summary: string;
  operations: unknown;
  status: "PENDING" | "APPLIED" | "REJECTED";
};

const BlockIdentity = Extension.create({
  name: "blockIdentity",
  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "heading",
          "bulletList",
          "orderedList",
          "taskList",
          "blockquote",
          "codeBlock",
          "horizontalRule",
          "image",
        ],
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-block-id"),
            renderHTML: (attributes) =>
              attributes.blockId
                ? { "data-block-id": String(attributes.blockId) }
                : {},
          },
        },
      },
    ];
  },
});

const COMMANDS: Array<{
  id: PageCommand;
  label: string;
  hint: string;
  keywords: string;
  icon: typeof Pilcrow;
}> = [
  {
    id: "paragraph",
    label: "Text",
    hint: "Plain text block",
    keywords: "paragraph text",
    icon: Pilcrow,
  },
  {
    id: "heading1",
    label: "Heading 1",
    hint: "Large section heading",
    keywords: "title heading",
    icon: Heading1,
  },
  {
    id: "heading2",
    label: "Heading 2",
    hint: "Medium section heading",
    keywords: "heading",
    icon: Heading2,
  },
  {
    id: "heading3",
    label: "Heading 3",
    hint: "Small section heading",
    keywords: "heading",
    icon: Heading3,
  },
  {
    id: "bullet",
    label: "Bulleted list",
    hint: "Create a simple list",
    keywords: "unordered list",
    icon: List,
  },
  {
    id: "ordered",
    label: "Numbered list",
    hint: "Create ordered steps",
    keywords: "number list",
    icon: ListOrdered,
  },
  {
    id: "checklist",
    label: "Checklist",
    hint: "Track lightweight items",
    keywords: "todo check task",
    icon: CheckSquare,
  },
  {
    id: "quote",
    label: "Quote",
    hint: "Emphasize a quotation",
    keywords: "blockquote",
    icon: Quote,
  },
  {
    id: "CALLOUT",
    label: "Callout",
    hint: "Highlight important context",
    keywords: "notice info",
    icon: Bell,
  },
  {
    id: "TOGGLE",
    label: "Toggle",
    hint: "Add collapsible context",
    keywords: "details disclosure",
    icon: MessageSquareQuote,
  },
  {
    id: "code",
    label: "Code",
    hint: "Monospaced code block",
    keywords: "snippet",
    icon: Code2,
  },
  {
    id: "divider",
    label: "Divider",
    hint: "Separate sections",
    keywords: "line separator",
    icon: Minus,
  },
  {
    id: "LINK",
    label: "Link",
    hint: "Add a labeled URL",
    keywords: "url",
    icon: Link2,
  },
  {
    id: "BOOKMARK",
    label: "Bookmark",
    hint: "Save a rich link",
    keywords: "url card",
    icon: Bookmark,
  },
  {
    id: "IMAGE",
    label: "Image",
    hint: "Embed a private or remote image",
    keywords: "photo upload",
    icon: Image,
  },
  {
    id: "FILE",
    label: "File",
    hint: "Attach a file",
    keywords: "attachment upload",
    icon: File,
  },
  {
    id: "TABLE",
    label: "Table",
    hint: "Insert a compact table",
    keywords: "grid rows columns",
    icon: Table2,
  },
  {
    id: "COLUMNS",
    label: "Columns",
    hint: "Split content into columns",
    keywords: "layout",
    icon: Columns3,
  },
  {
    id: "PAGE_MENTION",
    label: "Page mention",
    hint: "Reference another Page",
    keywords: "page link",
    icon: FileText,
  },
  {
    id: "DATE_MENTION",
    label: "Date mention",
    hint: "Reference a date",
    keywords: "calendar date",
    icon: CalendarDays,
  },
  {
    id: "FORM",
    label: "Form",
    hint: "Collect an authenticated response",
    keywords: "fields response submission",
    icon: FileText,
  },
];

const SPECIAL_LABELS: Record<SpecialKind, string> = {
  CALLOUT: "Callout text",
  TOGGLE: "Toggle summary",
  LINK: "Link URL",
  BOOKMARK: "Bookmark URL",
  IMAGE: "Image URL",
  FILE: "File URL",
  TABLE: "Table title",
  COLUMNS: "Columns label",
  PAGE_MENTION: "Page title",
  DATE_MENTION: "Date",
  FORM: "Form title",
};

function ensureBlockIds(editor: Editor) {
  let changed = false;
  const transaction = editor.state.tr;
  editor.state.doc.forEach((node, offset) => {
    if (!node.type.spec.attrs?.blockId || node.attrs.blockId) return;
    transaction.setNodeMarkup(offset, undefined, {
      ...node.attrs,
      blockId: crypto.randomUUID(),
    });
    changed = true;
  });
  if (changed) editor.view.dispatch(transaction);
  return changed;
}

function removeSlashText(editor: Editor) {
  const { $from } = editor.state.selection;
  return editor
    .chain()
    .focus()
    .deleteRange({ from: $from.start(), to: $from.end() });
}

export function PageWorkspace({ pageId }: { pageId: string }) {
  const router = useRouter();
  const hostRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revision = useRef(0);
  const hydrated = useRef(false);
  const pendingRange = useRef<{ from: number; to: number } | null>(null);
  const [page, setPage] = useState<PageDetail | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [slash, setSlash] = useState<{
    query: string;
    top: number;
    left: number;
  } | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [pendingInsert, setPendingInsert] = useState<SpecialKind | null>(null);
  const [pendingValue, setPendingValue] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [coverUrl, setCoverUrl] = useState("");
  const [toolOpen, setToolOpen] = useState<
    "comments" | "templates" | "ai" | null
  >(null);
  const [comments, setComments] = useState<PageComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [templates, setTemplates] = useState<PageTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [proposals, setProposals] = useState<PageProposal[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");

  const saveBlocks = useCallback(
    async (document: JSONContent, requestRevision: number) => {
      setSaveState("saving");
      const blocks = pageBlocksFromDocument(document);
      try {
        const response = await fetch(`/api/pages/${pageId}/blocks`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blocks }),
        });
        if (!response.ok) throw new Error("Save failed");
        if (revision.current === requestRevision) setSaveState("saved");
        localStorage.removeItem(`needt-page-draft:${pageId}`);
        window.dispatchEvent(new Event("pages-changed"));
      } catch {
        localStorage.setItem(
          `needt-page-draft:${pageId}`,
          JSON.stringify(document)
        );
        if (revision.current === requestRevision) setSaveState("failed");
      }
    },
    [pageId]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({
        placeholder: "Write anything, or type / for commands…",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      ImageExtension.configure({ allowBase64: false }),
      BlockIdentity,
      PageBlockNode,
    ],
    content: "<p></p>",
    editorProps: {
      attributes: {
        class: "needt-page-editor min-h-[55vh] cursor-text pb-48 outline-none",
        "aria-label": "Page document",
      },
      handleKeyDown: (_view, event) => {
        if (slash && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
          event.preventDefault();
          setSlashIndex((index) => {
            const count = Math.max(1, filteredCommands.length);
            return event.key === "ArrowDown"
              ? (index + 1) % count
              : (index - 1 + count) % count;
          });
          return true;
        }
        if (slash && event.key === "Enter" && filteredCommands[slashIndex]) {
          event.preventDefault();
          applyCommand(filteredCommands[slashIndex].id);
          return true;
        }
        if (event.key === "Escape") setSlash(null);
        return false;
      },
    },
    onUpdate: ({ editor: current }) => {
      if (!hydrated.current) return;
      ensureBlockIds(current);
      const document = current.getJSON();
      revision.current += 1;
      const requestRevision = revision.current;
      localStorage.setItem(
        `needt-page-draft:${pageId}`,
        JSON.stringify(document)
      );
      setSaveState("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(
        () => void saveBlocks(document, requestRevision),
        650
      );

      const { $from } = current.state.selection;
      const match = $from.parent.textContent.match(/^\/([^\s]*)$/);
      const host = hostRef.current;
      if (!match || !host) {
        setSlash(null);
        return;
      }
      const caret = current.view.coordsAtPos(current.state.selection.from);
      const bounds = host.getBoundingClientRect();
      setSlash({
        query: match[1].toLowerCase(),
        top: caret.bottom - bounds.top + 8,
        left: Math.max(
          0,
          Math.min(caret.left - bounds.left, bounds.width - 320)
        ),
      });
      setSlashIndex(0);
    },
    onSelectionUpdate: ({ editor: current }) => {
      if (
        !/^\/([^\s]*)$/.test(current.state.selection.$from.parent.textContent)
      )
        setSlash(null);
    },
  });

  const filteredCommands = useMemo(() => {
    if (!slash?.query) return COMMANDS;
    return COMMANDS.filter((command) =>
      `${command.label} ${command.keywords}`.toLowerCase().includes(slash.query)
    );
  }, [slash?.query]);

  useEffect(() => {
    if (!editor) return;
    let cancelled = false;
    hydrated.current = false;
    void fetch(`/api/pages/${pageId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Page not found");
        return response.json() as Promise<{ page: PageDetail }>;
      })
      .then(({ page: loaded }) => {
        if (cancelled) return;
        setPage(loaded);
        const localDraft = localStorage.getItem(`needt-page-draft:${pageId}`);
        if (localDraft) {
          try {
            editor.commands.setContent(JSON.parse(localDraft) as JSONContent, {
              emitUpdate: false,
            });
          } catch {
            editor.commands.setContent(legacyPageHtml(loaded.blocks), {
              emitUpdate: false,
            });
          }
          setSaveState("failed");
        } else {
          const document = documentFromPageBlocks(loaded.blocks);
          editor.commands.setContent(
            document || legacyPageHtml(loaded.blocks),
            { emitUpdate: false }
          );
        }
        ensureBlockIds(editor);
        hydrated.current = true;
      })
      .catch(() => router.replace("/pages"));
    return () => {
      cancelled = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [editor, pageId, router]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (saveState !== "saved") event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [saveState]);

  const patchPage = async (values: Record<string, unknown>) => {
    setPage((current) =>
      current ? ({ ...current, ...values } as PageDetail) : current
    );
    const response = await fetch(`/api/pages/${pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) toast.error("Could not update page");
    window.dispatchEvent(new Event("pages-changed"));
  };

  const openTool = async (tool: "comments" | "templates" | "ai") => {
    setToolOpen(tool);
    if (tool === "comments") {
      const response = await fetch(`/api/pages/${pageId}/comments`);
      if (response.ok) {
        const data = (await response.json()) as { comments: PageComment[] };
        setComments(data.comments);
      }
    }
    if (tool === "templates") {
      const response = await fetch("/api/page-templates");
      if (response.ok) {
        const data = (await response.json()) as { templates: PageTemplate[] };
        setTemplates(data.templates);
      }
    }
    if (tool === "ai") {
      const response = await fetch(
        `/api/ai/page-proposals?pageId=${encodeURIComponent(pageId)}`
      );
      if (response.ok) {
        const data = (await response.json()) as { proposals: PageProposal[] };
        setProposals(data.proposals);
      }
    }
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    const response = await fetch(`/api/pages/${pageId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentText }),
    });
    if (!response.ok) {
      toast.error("Could not add comment");
      return;
    }
    const data = (await response.json()) as { comment: PageComment };
    setComments((current) => [data.comment, ...current]);
    setCommentText("");
  };

  const resolveComment = async (comment: PageComment) => {
    const response = await fetch(`/api/page-comments/${comment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: !comment.resolvedAt }),
    });
    if (!response.ok) return;
    const data = (await response.json()) as { comment: PageComment };
    setComments((current) =>
      current.map((item) => (item.id === data.comment.id ? data.comment : item))
    );
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) return;
    const response = await fetch("/api/page-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId, name: templateName }),
    });
    if (!response.ok) {
      toast.error("Could not save template");
      return;
    }
    const data = (await response.json()) as { template: PageTemplate };
    setTemplates((current) => [
      data.template,
      ...current.filter((item) => item.id !== data.template.id),
    ]);
    setTemplateName("");
    toast.success("Template saved");
  };

  const instantiateTemplate = async (template: PageTemplate) => {
    const response = await fetch(
      `/api/page-templates/${template.id}/instantiate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrivate: true }),
      }
    );
    if (!response.ok) {
      toast.error("Could not create page from template");
      return;
    }
    const data = (await response.json()) as { page: { id: string } };
    window.dispatchEvent(new Event("pages-changed"));
    router.push(`/pages/${data.page.id}`);
  };

  const createProposal = async () => {
    if (!aiPrompt.trim()) return;
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Use propose_page_changes for pageId "${pageId}". ${aiPrompt}`,
      }),
    });
    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      toast.error(
        page?.isPrivate
          ? "AI review is disabled for private Pages"
          : error.error || "Could not create AI proposal"
      );
      return;
    }
    await response.text();
    const proposalsResponse = await fetch(
      `/api/ai/page-proposals?pageId=${encodeURIComponent(pageId)}`
    );
    if (proposalsResponse.ok) {
      const data = (await proposalsResponse.json()) as {
        proposals: PageProposal[];
      };
      setProposals(data.proposals);
    }
    setAiPrompt("");
  };

  const reviewProposal = async (
    proposal: PageProposal,
    decision: "approve" | "reject"
  ) => {
    const response = await fetch(
      `/api/ai/page-proposals/${proposal.id}/${decision}`,
      { method: "POST" }
    );
    if (!response.ok) {
      toast.error("Could not update proposal");
      return;
    }
    setProposals((current) =>
      current.map((item) =>
        item.id === proposal.id
          ? {
              ...item,
              status: decision === "approve" ? "APPLIED" : "REJECTED",
            }
          : item
      )
    );
    if (decision === "approve") window.location.reload();
  };

  const insertSpecial = (
    kind: SpecialKind,
    value: string,
    extraData?: Record<string, unknown>
  ) => {
    if (!editor) return;
    const data = extraData
      ? extraData
      : kind === "DATE_MENTION"
        ? { date: value }
        : kind === "PAGE_MENTION" || kind === "TABLE" || kind === "COLUMNS"
          ? { title: value }
          : kind === "CALLOUT" || kind === "TOGGLE"
            ? { text: value }
            : { url: value };
    const range = pendingRange.current;
    const content = [
      {
        type: "needtPageBlock",
        attrs: {
          blockId: crypto.randomUUID(),
          kind,
          data: JSON.stringify(data),
        },
      },
      { type: "paragraph" },
    ];
    const chain = editor.chain().focus();
    if (range) chain.insertContentAt(range, content).run();
    else chain.insertContent(content).run();
    pendingRange.current = null;
    setPendingInsert(null);
    setPendingValue("");
    setPendingFile(null);
    setSlash(null);
  };

  const submitSpecial = async () => {
    if (!pendingInsert) return;
    if (pendingInsert === "IMAGE" || pendingInsert === "FILE") {
      if (!pendingFile) return;
      setIsUploading(true);
      try {
        const form = new FormData();
        form.set("file", pendingFile);
        const response = await fetch(`/api/pages/${pageId}/assets`, {
          method: "POST",
          body: form,
        });
        const data = (await response.json()) as {
          asset?: { id: string; originalName: string; mimeType: string };
          url?: string;
          error?: string;
        };
        if (!response.ok || !data.asset || !data.url) {
          throw new Error(data.error || "Upload failed");
        }
        insertSpecial(pendingInsert, data.url, {
          url: data.url,
          assetId: data.asset.id,
          name: data.asset.originalName,
          mimeType: data.asset.mimeType,
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not upload asset"
        );
      } finally {
        setIsUploading(false);
      }
      return;
    }
    if (pendingInsert === "FORM") {
      const response = await fetch(`/api/pages/${pageId}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pendingValue,
          schema: {
            fields: [
              {
                id: "response",
                label: "Response",
                type: "textarea",
                required: true,
              },
            ],
          },
        }),
      });
      const data = (await response.json()) as {
        form?: { id: string; title: string };
        error?: string;
      };
      if (!response.ok || !data.form) {
        toast.error(data.error || "Could not create form");
        return;
      }
      insertSpecial("FORM", data.form.title, {
        formId: data.form.id,
        title: data.form.title,
      });
      return;
    }
    insertSpecial(pendingInsert, pendingValue);
  };

  const applyCommand = (command: PageCommand) => {
    if (!editor) return;
    if (
      command === "CALLOUT" ||
      command === "TOGGLE" ||
      command === "LINK" ||
      command === "BOOKMARK" ||
      command === "IMAGE" ||
      command === "FILE" ||
      command === "TABLE" ||
      command === "COLUMNS" ||
      command === "PAGE_MENTION" ||
      command === "DATE_MENTION" ||
      command === "FORM"
    ) {
      if (editor.isActive("blockquote")) {
        editor.chain().focus().lift("blockquote").run();
      }
      if (editor.isActive("listItem")) {
        editor.chain().focus().liftListItem("listItem").run();
      }
      if (editor.isActive("taskItem")) {
        editor.chain().focus().liftListItem("taskItem").run();
      }
      const { $from } = editor.state.selection;
      pendingRange.current = { from: $from.start(), to: $from.end() };
      setPendingInsert(command);
      setPendingFile(null);
      setPendingValue(
        command === "DATE_MENTION"
          ? new Date().toISOString().slice(0, 10)
          : command === "TABLE"
            ? "Table"
            : command === "COLUMNS"
              ? "Two columns"
              : ""
      );
      return;
    }

    const chain = removeSlashText(editor);
    if (command === "paragraph") chain.setParagraph().run();
    else if (command === "heading1") chain.toggleHeading({ level: 1 }).run();
    else if (command === "heading2") chain.toggleHeading({ level: 2 }).run();
    else if (command === "heading3") chain.toggleHeading({ level: 3 }).run();
    else if (command === "bullet") chain.toggleBulletList().run();
    else if (command === "ordered") chain.toggleOrderedList().run();
    else if (command === "checklist") chain.toggleTaskList().run();
    else if (command === "quote") chain.toggleBlockquote().run();
    else if (command === "code") chain.toggleCodeBlock().run();
    else if (command === "divider") chain.setHorizontalRule().run();
    setSlash(null);
  };

  if (!page) {
    return (
      <div className="mx-auto max-w-4xl animate-pulse px-8 py-16">
        <div className="mb-8 h-9 w-2/3 rounded bg-[var(--surface-raised)]" />
        <div className="h-64 rounded bg-[var(--surface-raised)]" />
      </div>
    );
  }
  if (page.database)
    return <DatabaseWorkspace page={page} onPatch={patchPage} />;

  return (
    <div className="min-h-dvh bg-[var(--app-bg)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-20 flex h-11 items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--app-bg)] px-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/pages")}
          aria-label="Back to pages"
        >
          <ChevronLeft />
        </Button>
        <span className="min-w-0 flex-1 truncate text-sm">
          {page.icon} {page.title}
        </span>
        <span className="text-[11px] text-[var(--text-muted)]">
          {saveState === "saving"
            ? "Saving…"
            : saveState === "failed"
              ? "Failed · draft kept"
              : "Saved"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!editor?.can().undo()}
          aria-label="Undo"
        >
          <Undo2 />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!editor?.can().redo()}
          aria-label="Redo"
        >
          <Redo2 />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void patchPage({ isFavorite: !page.isFavorite })}
          aria-label="Favorite"
        >
          <Star
            className={page.isFavorite ? "fill-current text-amber-400" : ""}
          />
        </Button>
        <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <LockKeyhole className="h-3.5 w-3.5" />
          <Switch
            checked={page.isPrivate}
            onCheckedChange={(checked) =>
              void patchPage({ isPrivate: checked })
            }
          />
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Page options">
              <MoreHorizontal />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-52 p-1.5">
            <button
              type="button"
              onClick={() => void openTool("comments")}
              className="flex h-9 w-full items-center gap-2 rounded-[var(--control-radius)] px-2.5 text-[13px] hover:bg-[var(--menu-item-hover)]"
            >
              <MessageSquare className="h-4 w-4 text-[var(--text-muted)]" />
              Comments
            </button>
            <button
              type="button"
              onClick={() => void openTool("templates")}
              className="flex h-9 w-full items-center gap-2 rounded-[var(--control-radius)] px-2.5 text-[13px] hover:bg-[var(--menu-item-hover)]"
            >
              <LayoutTemplate className="h-4 w-4 text-[var(--text-muted)]" />
              Templates
            </button>
            <button
              type="button"
              onClick={() => void openTool("ai")}
              className="flex h-9 w-full items-center gap-2 rounded-[var(--control-radius)] px-2.5 text-[13px] hover:bg-[var(--menu-item-hover)]"
            >
              <Sparkles className="h-4 w-4 text-[var(--text-muted)]" />
              Ask AI
            </button>
          </PopoverContent>
        </Popover>
      </header>

      {page.coverUrl && (
        <button
          type="button"
          aria-label="Change cover"
          onClick={() => {
            setCoverUrl(page.coverUrl || "");
            setCoverOpen(true);
          }}
          className="h-44 w-full bg-cover bg-center"
          style={{ backgroundImage: `url("${page.coverUrl}")` }}
        />
      )}

      <main
        ref={hostRef}
        className={cn(
          "relative mx-auto max-w-[900px] px-7 pb-32 sm:px-12 lg:px-20",
          page.coverUrl ? "pt-8" : "pt-16"
        )}
        onClick={(event) => {
          if (event.target === event.currentTarget)
            editor?.commands.focus("end");
        }}
      >
        <div className="mb-2 flex h-7 items-center gap-3 text-[12px] text-[var(--text-muted)]">
          <button
            type="button"
            onClick={() => void patchPage({ icon: page.icon ? null : "📄" })}
            className="rounded px-1.5 py-1 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            {page.icon ? "Remove icon" : "Add icon"}
          </button>
          {!page.coverUrl && (
            <button
              type="button"
              onClick={() => {
                setCoverUrl("");
                setCoverOpen(true);
              }}
              className="rounded px-1.5 py-1 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              Add cover
            </button>
          )}
        </div>
        {page.icon && <div className="mb-2 text-5xl">{page.icon}</div>}
        <input
          value={page.title}
          onChange={(event) => setPage({ ...page, title: event.target.value })}
          onBlur={() => void patchPage({ title: page.title })}
          className="mb-5 w-full border-0 bg-transparent p-0 text-4xl font-semibold tracking-[-0.045em] outline-none ring-0 placeholder:text-[var(--text-disabled)] focus:ring-0"
          placeholder="Untitled"
        />
        <div className="mb-4 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
          <Clock3 className="h-3.5 w-3.5" /> Edited just now
          {page.blocks.some((block) => block.createdBy === "AI") && (
            <span className="ml-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Written with AI
            </span>
          )}
        </div>
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget)
              editor?.commands.focus("end");
          }}
        >
          <EditorContent editor={editor} />
        </div>

        {slash && filteredCommands.length > 0 && (
          <div
            role="menu"
            aria-label="Page commands"
            className="needt-overlay-depth absolute z-30 max-h-[430px] w-[320px] overflow-y-auto rounded-[var(--panel-radius)] border border-[var(--popover-border)] p-1.5 shadow-lg"
            style={{ top: slash.top, left: slash.left }}
          >
            <div className="px-2.5 pb-1.5 pt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Blocks
            </div>
            {filteredCommands.map((command, index) => {
              const Icon = command.icon;
              return (
                <button
                  key={command.id}
                  type="button"
                  role="menuitem"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applyCommand(command.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[var(--control-radius)] px-2.5 py-2 text-left hover:bg-[var(--menu-item-hover)]",
                    index === slashIndex && "bg-[var(--menu-item-hover)]"
                  )}
                >
                  <Icon className="h-4 w-4 flex-none text-[var(--text-muted)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium">
                      {command.label}
                    </span>
                    <span className="block truncate text-[11px] text-[var(--text-muted)]">
                      {command.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <Dialog
        open={Boolean(pendingInsert)}
        onOpenChange={(open) => !open && setPendingInsert(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add {pendingInsert ? SPECIAL_LABELS[pendingInsert] : "block"}
            </DialogTitle>
            <DialogDescription>
              This value stays in the private page document.
            </DialogDescription>
          </DialogHeader>
          {pendingInsert === "IMAGE" || pendingInsert === "FILE" ? (
            <div className="space-y-2">
              <Label htmlFor="page-block-file">Private file</Label>
              <Input
                id="page-block-file"
                type="file"
                accept={pendingInsert === "IMAGE" ? "image/*" : undefined}
                onChange={(event) =>
                  setPendingFile(event.target.files?.[0] || null)
                }
              />
              <p className="text-[11px] text-[var(--text-muted)]">
                Stored privately with this Page · 10 MB maximum.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="page-block-value">
                {pendingInsert ? SPECIAL_LABELS[pendingInsert] : "Value"}
              </Label>
              <Input
                id="page-block-value"
                type={pendingInsert === "DATE_MENTION" ? "date" : "text"}
                value={pendingValue}
                onChange={(event) => setPendingValue(event.target.value)}
                autoFocus
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingInsert(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => void submitSpecial()}
              disabled={
                isUploading ||
                (pendingInsert === "IMAGE" || pendingInsert === "FILE"
                  ? !pendingFile
                  : !pendingValue.trim())
              }
            >
              {isUploading ? "Uploading…" : "Add block"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={coverOpen} onOpenChange={setCoverOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Page cover</DialogTitle>
            <DialogDescription>
              Use an image URL. The cover remains private with this page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="page-cover-url">Image URL</Label>
            <Input
              id="page-cover-url"
              type="url"
              value={coverUrl}
              onChange={(event) => setCoverUrl(event.target.value)}
              placeholder="https://…"
            />
          </div>
          <DialogFooter>
            {page.coverUrl && (
              <Button
                variant="outline"
                onClick={() => {
                  void patchPage({ coverUrl: null });
                  setCoverOpen(false);
                }}
              >
                Remove cover
              </Button>
            )}
            <Button
              onClick={() => {
                void patchPage({ coverUrl: coverUrl.trim() || null });
                setCoverOpen(false);
              }}
            >
              Save cover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={toolOpen === "comments"}
        onOpenChange={(open) => !open && setToolOpen(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Page comments</DialogTitle>
            <DialogDescription>
              Private notes for this Page. Resolve a thread when it is handled.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              aria-label="New page comment"
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Add a comment…"
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                onClick={() => void addComment()}
                disabled={!commentText.trim()}
              >
                Comment
              </Button>
            </div>
          </div>
          <div className="max-h-[360px] space-y-2 overflow-y-auto">
            {comments.length === 0 && (
              <div className="rounded-[var(--control-radius)] bg-[var(--surface-raised)] px-3 py-5 text-center text-[12px] text-[var(--text-muted)]">
                No comments yet.
              </div>
            )}
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={cn(
                  "rounded-[var(--control-radius)] border border-[var(--border-subtle)] p-3",
                  comment.resolvedAt && "opacity-55"
                )}
              >
                <p className="whitespace-pre-wrap text-[13px]">
                  {comment.body}
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                  <span>
                    {comment.resolvedAt ? "Resolved" : "Open"} ·{" "}
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => void resolveComment(comment)}
                    className="rounded px-2 py-1 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  >
                    {comment.resolvedAt ? "Reopen" : "Resolve"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={toolOpen === "templates"}
        onOpenChange={(open) => !open && setToolOpen(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Page templates</DialogTitle>
            <DialogDescription>
              Save this Page structure or create a private Page from a saved
              template.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              aria-label="Template name"
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              placeholder="Template name"
            />
            <Button
              onClick={() => void saveTemplate()}
              disabled={!templateName.trim()}
            >
              Save current
            </Button>
          </div>
          <div className="max-h-[360px] space-y-1 overflow-y-auto">
            {templates.length === 0 && (
              <div className="py-6 text-center text-[12px] text-[var(--text-muted)]">
                No saved templates.
              </div>
            )}
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex min-h-11 items-center gap-3 rounded-[var(--control-radius)] px-2.5 hover:bg-[var(--surface-hover)]"
              >
                <LayoutTemplate className="h-4 w-4 text-[var(--text-muted)]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">
                    {template.name}
                  </div>
                  {template.description && (
                    <div className="truncate text-[11px] text-[var(--text-muted)]">
                      {template.description}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void instantiateTemplate(template)}
                >
                  Use
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={toolOpen === "ai"}
        onOpenChange={(open) => !open && setToolOpen(null)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Ask AI</DialogTitle>
            <DialogDescription>
              AI changes are proposals only. Review the operation diff before
              applying it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              aria-label="AI page request"
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
              placeholder="Describe what should be added or rewritten…"
              rows={3}
              disabled={page.isPrivate}
            />
            {page.isPrivate && (
              <p className="text-[11px] text-[var(--text-muted)]">
                Turn off Private before sending Page content to an AI provider.
              </p>
            )}
            <div className="flex justify-end">
              <Button
                onClick={() => void createProposal()}
                disabled={page.isPrivate || !aiPrompt.trim()}
              >
                Create proposal
              </Button>
            </div>
          </div>
          <div className="max-h-[360px] space-y-2 overflow-y-auto">
            {proposals.length === 0 && (
              <div className="py-6 text-center text-[12px] text-[var(--text-muted)]">
                No AI proposals for this Page.
              </div>
            )}
            {proposals.map((proposal) => (
              <div
                key={proposal.id}
                className="rounded-[var(--control-radius)] border border-[var(--border-subtle)] p-3"
              >
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 text-[var(--color-accent)]" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium">
                      {proposal.summary}
                    </div>
                    <pre className="mt-2 max-h-28 overflow-auto rounded bg-[var(--surface-raised)] p-2 text-[10px] text-[var(--text-secondary)]">
                      {JSON.stringify(proposal.operations, null, 2)}
                    </pre>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-end gap-2">
                  {proposal.status === "PENDING" ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void reviewProposal(proposal, "reject")}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => void reviewProposal(proposal, "approve")}
                      >
                        Apply
                      </Button>
                    </>
                  ) : (
                    <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      {proposal.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
