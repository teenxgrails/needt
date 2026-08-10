"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { TaskItem, TaskList } from "@tiptap/extension-list";
import Placeholder from "@tiptap/extension-placeholder";
import { Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  CheckSquare,
  Code2,
  FilePlus2,
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

import {
  BlockIdentity,
  ensureBlockIds,
} from "@/components/documents/BlockIdentity";
import {
  decodeDocument,
  encodeDocument,
} from "@/components/documents/document-contract";
import type { AgendaGroup } from "@/components/today/AgendaTaskSection";
import { TaskGroupReference } from "@/components/today/TaskGroupReference";
import { TaskReference } from "@/components/today/TaskReference";
import { DailyAgendaAutosave } from "@/components/today/daily-agenda-autosave";
import {
  collapseDuplicateTaskReferences,
  collectTaskReferenceIds,
} from "@/components/today/task-reference-utils";

import { notify } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { randomId } from "@/lib/uuid";

import { Task } from "@/types/task";

interface DailyAgendaEditorProps {
  documentFormatVersion?: 1 | 2;
  dateKey: string;
  groups: AgendaGroup[];
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
  | "divider"
  | "code"
  | "page";

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
  {
    id: "code",
    label: "Code block",
    hint: "Monospaced code",
    icon: Code2,
    keywords: "code snippet",
  },
  {
    id: "page",
    label: "New page",
    hint: "Create a linked Page",
    icon: FilePlus2,
    keywords: "page document note",
  },
];

function removeSlashText(editor: Editor) {
  const { $from } = editor.state.selection;
  return editor
    .chain()
    .focus()
    .deleteRange({ from: $from.start(), to: $from.end() });
}

const AGENDA_GROUP_IDS = ["today", "overdue", "week", "completed"] as const;

function ensureAgendaGroups(editor: Editor) {
  const existing = new Set<string>();
  editor.state.doc.descendants((node) => {
    if (node.type.name === "taskGroupReference" && node.attrs.groupId) {
      existing.add(String(node.attrs.groupId));
    }
  });
  const missing = AGENDA_GROUP_IDS.filter((groupId) => !existing.has(groupId));
  if (missing.length === 0) return;

  editor.commands.insertContentAt(editor.state.doc.content.size, [
    ...missing.flatMap((groupId) => [
      {
        type: "taskGroupReference",
        attrs: { groupId, blockId: randomId() },
      },
      {
        type: "paragraph",
        attrs: { blockId: randomId() },
      },
    ]),
  ]);
}

export function DailyAgendaEditor({
  documentFormatVersion = 1,
  dateKey,
  groups,
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
  const revisionByDateRef = useRef(new Map<string, string | null>());
  const documentFormatVersionRef = useRef(documentFormatVersion);
  const hydratedKeyRef = useRef<string | null>(null);
  const createTaskRef = useRef(onCreateTask);
  const openTaskRef = useRef(onOpenTask);
  const completeTaskRef = useRef(onCompleteTask);
  const dateChangeRef = useRef(onDateChange);
  const durationChangeRef = useRef(onDurationChange);
  const referencedIdsChangeRef = useRef(onReferencedTaskIdsChange);
  const groupsRef = useRef(groups);
  const autosaveRef = useRef<DailyAgendaAutosave | null>(null);
  const scheduleSaveRef = useRef<(content: string) => void>(() => undefined);
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [loadVersion, setLoadVersion] = useState(0);
  const [slash, setSlash] = useState<{
    query: string;
    top: number;
    left: number;
  } | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);

  dateKeyRef.current = dateKey;
  documentFormatVersionRef.current = documentFormatVersion;
  createTaskRef.current = onCreateTask;
  openTaskRef.current = onOpenTask;
  completeTaskRef.current = onCompleteTask;
  dateChangeRef.current = onDateChange;
  durationChangeRef.current = onDurationChange;
  referencedIdsChangeRef.current = onReferencedTaskIdsChange;
  groupsRef.current = groups;

  if (!autosaveRef.current) {
    autosaveRef.current = new DailyAgendaAutosave({
      getActiveDate: () => dateKeyRef.current,
      getDocumentFormatVersion: () => documentFormatVersionRef.current,
      onStateChange: setSaveState,
      persistDraft: (date, content) =>
        localStorage.setItem(`needt-agenda-draft:${date}`, content),
      removeDraft: (date) =>
        localStorage.removeItem(`needt-agenda-draft:${date}`),
      save: async (entry) => {
        const response = await fetch("/api/daily-agenda", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "If-Match": revisionByDateRef.current.get(entry.date) ?? "none",
          },
          body: JSON.stringify(entry),
        });
        if (!response.ok) throw new Error("Agenda save failed");
        if (response.status !== 202) {
          const saved = (await response.json()) as { updatedAt: string };
          revisionByDateRef.current.set(entry.date, saved.updatedAt);
        }
      },
    });
  }

  const flushSave = (targetDate?: string) =>
    autosaveRef.current?.flush(targetDate) ?? Promise.resolve();

  scheduleSaveRef.current = (content: string) => {
    const hydratedDate = hydratedKeyRef.current;
    if (!hydratedDate || hydratedDate !== dateKeyRef.current) return;
    autosaveRef.current?.schedule(hydratedDate, content);
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({
        placeholder: "Write your plan, or type / for commands…",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      BlockIdentity,
      TaskReference.configure({
        onOpenTask: (task) => openTaskRef.current(task),
        onComplete: (task) => completeTaskRef.current(task),
        onDateChange: (task, date) => dateChangeRef.current(task, date),
        onDurationChange: (task, duration) =>
          durationChangeRef.current(task, duration),
      }),
      TaskGroupReference.configure({
        getGroup: (groupId) =>
          groupsRef.current.find((group) => group.id === groupId),
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
          "agenda-rich-text min-h-[clamp(180px,24vh,300px)] cursor-text outline-none",
        "aria-label": "Daily agenda notes",
      },
      handleKeyDown: (view, event) => {
        const { $from } = view.state.selection;
        const line = $from.parent.textContent.trim();

        if (slash && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
          event.preventDefault();
          setSlashIndex((index) => {
            const count = Math.max(1, filteredItems.length);
            return event.key === "ArrowDown"
              ? (index + 1) % count
              : (index - 1 + count) % count;
          });
          return true;
        }
        if (slash && event.key === "Enter" && filteredItems[slashIndex]) {
          event.preventDefault();
          applyCommand(filteredItems[slashIndex].id);
          return true;
        }
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
              notify.success("Task created");
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
              notify.error("Could not create task. Your command was restored.");
            });
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (collapseDuplicateTaskReferences(currentEditor)) return;
      if (ensureBlockIds(currentEditor)) return;
      scheduleSaveRef.current(encodeDocument("today", currentEditor.getJSON()));
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
      setSlashIndex(0);
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
        const agenda = (await response.json()) as {
          content?: string;
          updatedAt?: string | null;
        };
        if (controller.signal.aborted) return;
        revisionByDateRef.current.set(dateKey, agenda.updatedAt ?? null);
        const localDraft = localStorage.getItem(
          `needt-agenda-draft:${dateKey}`
        );
        const stored = localDraft || agenda.content || "";
        const decoded = decodeDocument(stored, "today");
        editor.commands.setContent(decoded, { emitUpdate: false });
        collapseDuplicateTaskReferences(editor);
        ensureAgendaGroups(editor);
        ensureBlockIds(editor);
        hydratedKeyRef.current = dateKey;
        editor.setEditable(true);
        referencedIdsChangeRef.current(
          dateKey,
          collectTaskReferenceIds(editor)
        );
        setSaveState(localDraft ? "error" : "saved");
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setSaveState("load-error");
      }
    };

    void loadAgenda();

    return () => {
      controller.abort();
      void flushSave();
    };
  }, [dateKey, editor, loadVersion]);

  useEffect(
    () => () => {
      autosaveRef.current?.dispose();
      void autosaveRef.current?.flush();
    },
    []
  );

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
    if (command === "code") chain.toggleCodeBlock().run();
    if (command === "page") {
      chain.insertContent("Creating page…").run();
      void fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled" }),
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("Page creation failed");
          const { page } = (await response.json()) as { page: { id: string } };
          window.dispatchEvent(new Event("pages-changed"));
          notify.success("Page created", {
            action: {
              label: "Open",
              onClick: () => {
                window.location.href = `/pages/${page.id}`;
              },
            },
          });
        })
        .catch(() => notify.error("Could not create page"));
    }
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
          {filteredItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyCommand(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[var(--menu-item-hover)]",
                  index === slashIndex && "bg-[var(--menu-item-hover)]"
                )}
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
