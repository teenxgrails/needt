"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { TaskItem, TaskList } from "@tiptap/extension-list";
import Placeholder from "@tiptap/extension-placeholder";
import { Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  type LucideIcon,
  Minus,
  Quote,
  SquareCheckBig,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface DailyAgendaEditorProps {
  dateKey: string;
  onCreateTask: (title: string) => Promise<void>;
}

type SaveState = "loading" | "saved" | "saving" | "error";
type AgendaCommand =
  | "task"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bullet"
  | "ordered"
  | "checklist"
  | "quote"
  | "divider";

interface SlashItem {
  id: AgendaCommand;
  label: string;
  hint: string;
  icon: LucideIcon;
  keywords: string;
}

const SLASH_ITEMS: SlashItem[] = [
  {
    id: "task",
    label: "New task",
    hint: "Create with today defaults",
    icon: SquareCheckBig,
    keywords: "task todo",
  },
  {
    id: "heading1",
    label: "Heading 1",
    hint: "Large section title",
    icon: Heading1,
    keywords: "heading title",
  },
  {
    id: "heading2",
    label: "Heading 2",
    hint: "Medium section title",
    icon: Heading2,
    keywords: "heading subtitle",
  },
  {
    id: "heading3",
    label: "Heading 3",
    hint: "Small section title",
    icon: Heading3,
    keywords: "heading subtitle",
  },
  {
    id: "bullet",
    label: "Bulleted list",
    hint: "Simple list",
    icon: List,
    keywords: "bullet list",
  },
  {
    id: "ordered",
    label: "Numbered list",
    hint: "Ordered steps",
    icon: ListOrdered,
    keywords: "number ordered list",
  },
  {
    id: "checklist",
    label: "Check list",
    hint: "Lightweight notes checklist",
    icon: CheckSquare,
    keywords: "check checklist",
  },
  {
    id: "quote",
    label: "Blockquote",
    hint: "Call out a thought",
    icon: Quote,
    keywords: "quote callout",
  },
  {
    id: "divider",
    label: "Divider",
    hint: "Separate sections",
    icon: Minus,
    keywords: "divider line",
  },
];

function removeSlashText(editor: Editor) {
  const { $from } = editor.state.selection;
  return editor
    .chain()
    .focus()
    .deleteRange({ from: $from.start(), to: $from.end() });
}

export function DailyAgendaEditor({
  dateKey,
  onCreateTask,
}: DailyAgendaEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const dateKeyRef = useRef(dateKey);
  const hydratedKeyRef = useRef<string | null>(null);
  const createTaskRef = useRef(onCreateTask);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<{ date: string; content: string } | null>(null);
  const scheduleSaveRef = useRef<(content: string) => void>(() => undefined);
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [slash, setSlash] = useState<{
    query: string;
    top: number;
    left: number;
  } | null>(null);

  dateKeyRef.current = dateKey;
  createTaskRef.current = onCreateTask;

  const flushSave = async () => {
    const pending = pendingSaveRef.current;
    if (!pending) return;
    pendingSaveRef.current = null;
    setSaveState("saving");

    try {
      const response = await fetch("/api/daily-agenda", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending),
      });
      if (!response.ok) throw new Error("Agenda save failed");
      if (!pendingSaveRef.current) setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  scheduleSaveRef.current = (content: string) => {
    const hydratedDate = hydratedKeyRef.current;
    if (!hydratedDate || hydratedDate !== dateKeyRef.current) return;
    pendingSaveRef.current = { date: hydratedDate, content };
    setSaveState("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => void flushSave(), 550);
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({
        placeholder: "Write your plan, or type / for commands…",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "agenda-rich-text min-h-[112px] outline-none",
        "aria-label": "Daily agenda notes",
      },
      handleKeyDown: (view, event) => {
        const { $from } = view.state.selection;
        const line = $from.parent.textContent.trim();

        if (event.key === "Escape") {
          setSlash(null);
          return false;
        }

        const taskMatch = line.match(/^\/task\s+(.+)$/i);
        if (event.key === "Enter" && taskMatch?.[1]?.trim()) {
          event.preventDefault();
          view.dispatch(view.state.tr.delete($from.start(), $from.end()));
          setSlash(null);
          void createTaskRef.current(taskMatch[1].trim());
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      scheduleSaveRef.current(currentEditor.getHTML());
      const { $from } = currentEditor.state.selection;
      const line = $from.parent.textContent;
      const match = line.match(/^\/([^\s]*)$/);
      const host = hostRef.current;
      if (!match || !host) {
        setSlash(null);
        return;
      }

      const caret = currentEditor.view.coordsAtPos(
        currentEditor.state.selection.from
      );
      const bounds = host.getBoundingClientRect();
      setSlash({
        query: match[1].toLowerCase(),
        top: caret.bottom - bounds.top + 8,
        left: Math.max(
          0,
          Math.min(caret.left - bounds.left, bounds.width - 292)
        ),
      });
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      const line = currentEditor.state.selection.$from.parent.textContent;
      if (!/^\/([^\s]*)$/.test(line)) setSlash(null);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const controller = new AbortController();

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    void flushSave();
    hydratedKeyRef.current = null;
    setSaveState("loading");
    setSlash(null);

    void fetch(`/api/daily-agenda?date=${encodeURIComponent(dateKey)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Agenda load failed");
        return response.json() as Promise<{ content?: string }>;
      })
      .then((agenda) => {
        if (controller.signal.aborted) return;
        editor.commands.setContent(agenda.content || "<p></p>", {
          emitUpdate: false,
        });
        hydratedKeyRef.current = dateKey;
        setSaveState("saved");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setSaveState("error");
      });

    return () => {
      controller.abort();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      void flushSave();
    };
  }, [dateKey, editor]);

  const filteredItems = useMemo(() => {
    if (!slash?.query) return SLASH_ITEMS;
    return SLASH_ITEMS.filter((item) =>
      `${item.label} ${item.keywords}`.toLowerCase().includes(slash.query)
    );
  }, [slash?.query]);

  const applyCommand = (command: AgendaCommand) => {
    if (!editor) return;
    const chain = removeSlashText(editor);

    if (command === "task") chain.insertContent("/task ").run();
    if (command === "heading1") chain.toggleHeading({ level: 1 }).run();
    if (command === "heading2") chain.toggleHeading({ level: 2 }).run();
    if (command === "heading3") chain.toggleHeading({ level: 3 }).run();
    if (command === "bullet") chain.toggleBulletList().run();
    if (command === "ordered") chain.toggleOrderedList().run();
    if (command === "checklist") chain.toggleTaskList().run();
    if (command === "quote") chain.toggleBlockquote().run();
    if (command === "divider") chain.setHorizontalRule().run();
    setSlash(null);
  };

  return (
    <section className="relative" ref={hostRef}>
      <EditorContent editor={editor} />

      {slash && filteredItems.length > 0 && (
        <div
          role="menu"
          aria-label="Agenda commands"
          className="needt-overlay-depth absolute z-30 w-[292px] overflow-hidden rounded-xl border border-[var(--popover-border)] p-1.5 shadow-lg"
          style={{ top: slash.top, left: slash.left }}
        >
          {filteredItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyCommand(item.id)}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[var(--menu-item-hover)]"
              >
                <Icon className="h-4 w-4 flex-none text-[var(--text-muted)]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-[var(--text-primary)]">
                    {item.label}
                  </span>
                  <span className="block truncate text-[11px] text-[var(--text-muted)]">
                    {item.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <p
        aria-live="polite"
        className={cn(
          "mt-2 text-[10px] text-[var(--text-muted)] transition-opacity",
          saveState === "saved" && "opacity-45",
          saveState === "loading" && "opacity-70",
          saveState === "error" && "text-[var(--color-danger)] opacity-100"
        )}
      >
        {saveState === "loading" && "Loading agenda…"}
        {saveState === "saving" && "Saving…"}
        {saveState === "saved" && "Saved"}
        {saveState === "error" && "Could not save this agenda"}
      </p>
    </section>
  );
}
