"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  type ReactNodeViewProps,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { AlertCircle, X } from "lucide-react";

import { AgendaTaskRow } from "@/components/today/AgendaTaskRow";

import { useTaskStore } from "@/store/task";

import { Task } from "@/types/task";

export interface TaskReferenceOptions {
  onOpenTask: (task: Task) => void;
  onComplete: (task: Task) => Promise<void>;
  onDateChange: (task: Task, date: Date | null) => Promise<void>;
  onDurationChange: (task: Task, duration: number | null) => Promise<void>;
}

function TaskReferenceView({
  node,
  extension,
  deleteNode,
}: ReactNodeViewProps) {
  const taskId = String(node.attrs.taskId ?? "");
  const task = useTaskStore((state) =>
    state.tasks.find((candidate) => candidate.id === taskId)
  );
  const loading = useTaskStore((state) => state.loading);
  const fetchTasks = useTaskStore((state) => state.fetchTasks);
  const options = extension.options as TaskReferenceOptions;

  if (!task) {
    return (
      <NodeViewWrapper
        as="div"
        data-type="taskReference"
        className="my-1 flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-[var(--border-subtle)] px-3 text-[13px] text-[var(--text-muted)]"
        contentEditable={false}
      >
        <AlertCircle className="h-4 w-4" />
        <span className="min-w-0 flex-1">
          {loading ? "Loading task…" : "Task is unavailable"}
        </span>
        {!loading && (
          <button
            type="button"
            onClick={() => void fetchTasks()}
            className="min-h-11 rounded-md px-2 py-1 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] sm:min-h-8"
          >
            Retry
          </button>
        )}
        <button
          type="button"
          onClick={deleteNode}
          aria-label="Remove unavailable task from agenda"
          className="grid h-11 w-11 place-items-center rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] sm:h-8 sm:w-8"
        >
          <X className="h-4 w-4" />
        </button>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      as="div"
      data-type="taskReference"
      className="my-0.5"
      contentEditable={false}
    >
      <AgendaTaskRow
        task={task}
        onOpen={() => options.onOpenTask(task)}
        onComplete={() => void options.onComplete(task)}
        onDateChange={(date) => void options.onDateChange(task, date)}
        onDurationChange={(duration) =>
          void options.onDurationChange(task, duration)
        }
      />
    </NodeViewWrapper>
  );
}

export const TaskReference = Node.create<TaskReferenceOptions>({
  name: "taskReference",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return {
      onOpenTask: () => undefined,
      onComplete: async () => undefined,
      onDateChange: async () => undefined,
      onDurationChange: async () => undefined,
    };
  },

  addAttributes() {
    return {
      taskId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-task-id"),
        renderHTML: (attributes) => ({
          "data-task-id": attributes.taskId,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="taskReference"][data-task-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "taskReference" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TaskReferenceView);
  },
});
