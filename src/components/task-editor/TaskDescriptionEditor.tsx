"use client";

import { useEffect, useState } from "react";

import ImageExtension from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Editor,
  EditorContent,
  useEditor,
  useEditorState,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Check,
  Code2,
  Heading1,
  Heading2,
  Image,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  serializeTaskDescription,
  taskDescriptionToHtml,
} from "@/lib/task-description-format";
import { cn } from "@/lib/utils";

interface TaskDescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
}

interface ToolbarButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid h-[30px] w-[30px] flex-none place-items-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-35",
        active && "bg-[var(--surface-hover)] text-[var(--text-primary)]"
      )}
    >
      {children}
    </button>
  );
}

function normalizeExternalUrl(value: string): string | null {
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(value)
    ? value
    : `https://${value}`;

  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function UrlPopover({
  editor,
  mode,
}: {
  editor: Editor;
  mode: "link" | "image";
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const label = mode === "link" ? "Link" : "Image";
  const Icon = mode === "link" ? Link2 : Image;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setUrl(
        mode === "link" ? String(editor.getAttributes("link").href ?? "") : ""
      );
    }
  };

  const apply = () => {
    const normalized = normalizeExternalUrl(url.trim());
    if (!normalized) return;

    if (mode === "link") {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: normalized })
        .run();
    } else {
      editor.chain().focus().setImage({ src: normalized }).run();
    }
    setOpen(false);
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={mode === "link" && editor.isActive("link")}
          className={cn(
            "grid h-[30px] w-[30px] flex-none place-items-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
            mode === "link" &&
              editor.isActive("link") &&
              "bg-[var(--surface-hover)] text-[var(--text-primary)]"
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 border-[var(--popover-border)] bg-[var(--popover-bg)] p-3 text-[var(--text-primary)]"
      >
        <div className="mb-2 text-[13px] font-semibold">
          {mode === "link" ? "Add a link" : "Insert an image URL"}
        </div>
        <div className="flex gap-1.5">
          <input
            autoFocus
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                apply();
              }
            }}
            placeholder="https://"
            aria-label={`${label} URL`}
            className="h-8 min-w-0 flex-1 rounded-md border border-[var(--border-control)] bg-[var(--surface-input)] px-2 text-[12px] outline-none placeholder:text-[var(--text-muted)]"
          />
          <button
            type="button"
            onClick={apply}
            disabled={!url.trim()}
            className="grid h-8 w-8 place-items-center rounded-md bg-[var(--surface-control)] text-[var(--text-primary)] hover:bg-[var(--surface-control-hover)] disabled:opacity-40"
            aria-label={`Apply ${label.toLowerCase()}`}
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
        {mode === "link" && editor.isActive("link") && (
          <button
            type="button"
            onClick={removeLink}
            className="mt-2 rounded px-1 py-0.5 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Remove link
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function TaskDescriptionEditor({
  value,
  onChange,
}: TaskDescriptionEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        link: {
          autolink: true,
          defaultProtocol: "https",
          openOnClick: false,
          HTMLAttributes: {
            target: "_blank",
            rel: "noopener noreferrer",
          },
        },
      }),
      ImageExtension.configure({
        allowBase64: false,
        inline: false,
      }),
      Placeholder.configure({
        placeholder: "Description",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: taskDescriptionToHtml(value),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "task-rich-text task-rich-text-editor min-h-[260px] h-full outline-none",
        "aria-label": "Task description",
        "data-testid": "task-description-editor",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(serializeTaskDescription(currentEditor.getHTML()));
    },
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      bold: currentEditor?.isActive("bold") ?? false,
      italic: currentEditor?.isActive("italic") ?? false,
      underline: currentEditor?.isActive("underline") ?? false,
      strike: currentEditor?.isActive("strike") ?? false,
      heading1: currentEditor?.isActive("heading", { level: 1 }) ?? false,
      heading2: currentEditor?.isActive("heading", { level: 2 }) ?? false,
      bulletList: currentEditor?.isActive("bulletList") ?? false,
      orderedList: currentEditor?.isActive("orderedList") ?? false,
      taskList: currentEditor?.isActive("taskList") ?? false,
      code: currentEditor?.isActive("code") ?? false,
      canUndo: currentEditor?.can().chain().focus().undo().run() ?? false,
      canRedo: currentEditor?.can().chain().focus().redo().run() ?? false,
    }),
  });

  useEffect(() => {
    if (!editor) return;
    const nextHtml = taskDescriptionToHtml(value);
    if (editor.getHTML() !== nextHtml) {
      editor.commands.setContent(nextHtml, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div
        className="min-h-[260px] flex-1 text-[14px] text-[var(--text-muted)]"
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        aria-label="Description toolbar"
        className="flex h-[52px] flex-none items-start gap-0.5 overflow-x-auto pt-1"
      >
        <ToolbarButton
          label="Bold"
          active={state?.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={state?.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={state?.underline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          active={state?.strike}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 1"
          active={state?.heading1}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 2"
          active={state?.heading2}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Bulleted list"
          active={state?.bulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={state?.orderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Checklist"
          active={state?.taskList}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <ListChecks className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Inline code"
          active={state?.code}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code2 className="h-4 w-4" />
        </ToolbarButton>
        <UrlPopover editor={editor} mode="link" />
        <UrlPopover editor={editor} mode="image" />
        <span
          aria-hidden="true"
          className="mx-1 mt-1 h-5 w-px flex-none bg-[var(--border-subtle)]"
        />
        <ToolbarButton
          label="Undo"
          disabled={!state?.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={!state?.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <EditorContent
        editor={editor}
        className="min-h-0 flex-1 overflow-y-auto"
      />
    </div>
  );
}
