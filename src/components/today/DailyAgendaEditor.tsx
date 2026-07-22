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
import { toast } from "sonner";

import { TaskReference } from "@/components/today/TaskReference";
import { collectTaskReferenceIds } from "@/components/today/task-reference-utils";

import { cn } from "@/lib/utils";

import { Task } from "@/types/task";

interface DailyAgendaEditorProps {
  dateKey: string;
  onCreateTask: (title: string) => Promise<Task>;
  onOpenTask: (task: Task) => void;
  onCompleteTask: (task: Task) => Promise<void>;
  onDateChange: (task: Task, date: Date | null) => Promise<void>;
  onDurationChange: (task: Task, duration: number | null) => Promise<void>;
  onReferencedTaskIdsChange: (dateKey: string, ids: Set<string>) => void;
}

type SaveState = "loading" | "saved" | "saving" | "error" | "load-error";
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
  onOpenTask,
  onCompleteTask,
  onDateChange,
  onDurationChange,
  onReferencedTaskIdsChange,
}: DailyAgendaEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const dateKeyRef = useRef(dateKey);
  const hydratedKeyRef = useRef<string | null>(null);
  const createTaskRef = useRef(onCreateTask);
  const openTaskRef = useRef(onOpenTask);
  const completeTaskRef = useRef(onCompleteTask);
  const dateChangeRef = useRef(onDateChange);
  const durationChangeRef = useRef(onDurationChange);
  const referencedIdsChangeRef = useRef(onReferencedTaskIdsChange);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSavesRef = useRef(new Map<string, string>());
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const scheduleSaveRef = useRef<(content: string) => void>(() => undefined);
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [loadVersion, setLoadVersion] = useState(0);
  const [slash, setSlash] = useState<{
    query: string;
    top: number;
    left: number;
  } | null>(null);

  dateKeyRef.current = dateKey;
  createTaskRef.current = onCreateTask;
  openTaskRef.current = onOpenTask;
  completeTaskRef.current = onCompleteTask;
  dateChangeRef.current = onDateChange;
  durationChangeRef.current = onDurationChange;
  referencedIdsChangeRef.current = onReferencedTaskIdsChange;

  const flushSave = (targetDate?: string) => {
    const pending = Array.from(pendingSavesRef.current.entries())
      .filter(([date]) => !targetDate || date === targetDate)
      .map(([date, content]) => ({ date, content }));
    if (pending.length === 0) return saveQueueRef.current;

    for (const { date, content } of pending) {
      if (pendingSavesRef.current.get(date) === content) {
        pendingSavesRef.current.delete(date);
      }
    }
    if (pending.some(({ date }) => dateKeyRef.current === date)) {
      setSaveState("saving");
    }

    const request = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        for (const entry of pending) {
          try {
            const response = await fetch("/api/daily-agenda", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(entry),
            });
            if (!response.ok) throw new Error("Agenda save failed");
            if (
              !pendingSavesRef.current.has(entry.date) &&
              dateKeyRef.current === entry.date
            ) {
              setSaveState("saved");
            }
          } catch {
            // Never replace a newer local edit with the failed request body.
            if (!pendingSavesRef.current.has(entry.date)) {
              pendingSavesRef.current.set(entry.date, entry.content);
            }
            if (dateKeyRef.current === entry.date) setSaveState("error");
          }
        }
      });
    saveQueueRef.current = request;
    return request;
  };

  scheduleSaveRef.current = (content: string) => {
    const hydratedDate = hydratedKeyRef.current;
    if (!hydratedDate || hydratedDate !== dateKeyRef.current) return;
    pendingSavesRef.current.set(hydratedDate, content);
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
      TaskReference.configure({
        onOpenTask: (task) => openTaskRef.current(task),
        onComplete: (task) => completeTaskRef.current(task),
        onDateChange: (task, date) => dateChangeRef.current(task, date),
        onDurationChange: (task, duration) =>
          durationChangeRef.current(task, duration),
      }),
    ],
    content: "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "agenda-rich-text min-h-[clamp(220px,30vh,360px)] cursor-text outline-none xl:text-[18px] xl:leading-[1.7]",
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
          const insertAt = $from.start();
          const taskTitle = taskMatch[1].trim();
          const commandDateKey = dateKeyRef.current;
          view.dispatch(view.state.tr.delete($from.start(), $from.end()));
          setSlash(null);
          void createTaskRef
            .current(taskTitle)
            .then((task) => {
              const currentEditor = editorRef.current;
              if (
                !currentEditor ||
                currentEditor.isDestroyed ||
                dateKeyRef.current !== commandDateKey
              )
                return;
              currentEditor
                .chain()
                .focus()
                .insertContentAt(
                  Math.min(insertAt, currentEditor.state.doc.content.size),
                  {
                    type: "taskReference",
                    attrs: { taskId: task.id },
                  }
                )
                .run();
              referencedIdsChangeRef.current(
                commandDateKey,
                collectTaskReferenceIds(currentEditor)
              );
              toast.success("Task created");
            })
            .catch(() => {
              const currentEditor = editorRef.current;
              if (
                currentEditor &&
                !currentEditor.isDestroyed &&
                dateKeyRef.current === commandDateKey
              ) {
                currentEditor.commands.insertContentAt(
                  Math.min(insertAt, currentEditor.state.doc.content.size),
                  `<p>/task ${taskTitle}</p>`
                );
              }
              toast.error("Could not create task. Your command was restored.");
            });
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      scheduleSaveRef.current(currentEditor.getHTML());
      referencedIdsChangeRef.current(
        dateKeyRef.current,
        collectTaskReferenceIds(currentEditor)
      );
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
    onCreate: ({ editor: currentEditor }) => {
      editorRef.current = currentEditor;
    },
    onDestroy: () => {
      editorRef.current = null;
    },
  });

  useEffect(() => {
    if (!editor) return;
    const controller = new AbortController();

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    hydratedKeyRef.current = null;
    editor.setEditable(false);
    editor.commands.setContent("<p></p>", { emitUpdate: false });
    referencedIdsChangeRef.current(dateKey, new Set());
    setSaveState("loading");
    setSlash(null);

    const loadAgenda = async () => {
      try {
        await flushSave();
        if (controller.signal.aborted) return;
        const response = await fetch(
          `/api/daily-agenda?date=${encodeURIComponent(dateKey)}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error("Agenda load failed");
        const agenda = (await response.json()) as { content?: string };
        if (controller.signal.aborted) return;
        editor.commands.setContent(agenda.content || "<p></p>", {
          emitUpdate: false,
        });
        hydratedKeyRef.current = dateKey;
        editor.setEditable(true);
        referencedIdsChangeRef.current(
          dateKey,
          collectTaskReferenceIds(editor)
        );
        setSaveState("saved");
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setSaveState("load-error");
      }
    };

    void loadAgenda();

    return () => {
      controller.abort();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      void flushSave();
    };
  }, [dateKey, editor, loadVersion]);

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
    <section
      className="relative min-h-[clamp(260px,34vh,430px)]"
      ref={hostRef}
      onClick={(event) => {
        if (event.target === event.currentTarget) editor?.commands.focus("end");
      }}
    >
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

      <div
        aria-live="polite"
        className={cn(
          "mt-2 flex min-h-6 items-center gap-2 text-[10px] text-[var(--text-muted)] transition-opacity",
          saveState === "saved" && "opacity-45",
          saveState === "loading" && "opacity-70",
          (saveState === "error" || saveState === "load-error") &&
            "text-[var(--color-danger)] opacity-100"
        )}
      >
        <span>
          {saveState === "loading" && "Loading agenda…"}
          {saveState === "saving" && "Saving…"}
          {saveState === "saved" && "Saved"}
          {saveState === "error" && "Could not save this agenda"}
          {saveState === "load-error" && "Could not load this agenda"}
        </span>
        {(saveState === "error" || saveState === "load-error") && (
          <button
            type="button"
            onClick={() => {
              if (saveState === "load-error") {
                setLoadVersion((version) => version + 1);
                return;
              }
              void flushSave(dateKeyRef.current);
            }}
            className="rounded-md px-2 py-1 font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
          >
            Retry
          </button>
        )}
      </div>
    </section>
  );
}
