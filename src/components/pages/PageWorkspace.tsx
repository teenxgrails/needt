"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import {
  HocuspocusProvider,
  HocuspocusProviderWebsocket,
} from "@hocuspocus/provider";
import { type JSONContent } from "@tiptap/core";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
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
  FilePlus,
  FileText,
  FolderKanban,
  Heading1,
  Heading2,
  Heading3,
  History,
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
  ShieldCheck,
  Sparkles,
  Star,
  Table2,
  Undo2,
} from "lucide-react";
import * as Y from "yjs";

import {
  BlockIdentity,
  ensureBlockIds,
} from "@/components/documents/BlockIdentity";
import { DatabaseWorkspace } from "@/components/pages/DatabaseWorkspace";
import { PageBlockNode } from "@/components/pages/PageBlockNode";
import {
  PageAutosave,
  type PageSaveState,
} from "@/components/pages/page-autosave";
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
import { NeedtPicker } from "@/components/ui/needt-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { notify } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { randomId } from "@/lib/uuid";

type SaveState = PageSaveState;
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
  | "TASK_REFERENCE"
  | "PROJECT_REFERENCE"
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
type PageRevision = {
  id: string;
  createdAt: string;
  createdBy: "HUMAN" | "AI";
};
type PageReference = {
  id: string;
  title: string;
  icon: string | null;
  updatedAt: string;
};
type PagePermissionRole = "FULL_ACCESS" | "EDITOR" | "VIEWER";
type PagePermissionGrant = {
  userId: string;
  role: PagePermissionRole;
  user: { name: string | null; email: string | null; image: string | null };
};
type WorkspaceMember = {
  userId: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
  user: { name: string | null; email: string | null; image: string | null };
};
type PagePublication = { published: boolean; url: string | null };
type CollaborationTokenResponse = {
  token: string;
  documentName: string;
  initialState: string;
  url: string;
  role: PagePermissionRole;
  user: { name: string; color: string };
};
type AiAction = "rewrite" | "summarize" | "critique";

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
    id: "TASK_REFERENCE",
    label: "Task",
    hint: "Create and embed a workspace task",
    keywords: "task todo action",
    icon: CheckSquare,
  },
  {
    id: "PROJECT_REFERENCE",
    label: "Project",
    hint: "Create and embed a workspace project",
    keywords: "project initiative",
    icon: FolderKanban,
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
  TASK_REFERENCE: "Task title",
  PROJECT_REFERENCE: "Project title",
  DATE_MENTION: "Date",
  FORM: "Form title",
};

const PAGE_PERMISSION_OPTIONS = [
  {
    value: "INHERITED",
    label: "Inherited",
    description: "Use the workspace role",
  },
  { value: "FULL_ACCESS", label: "Full access" },
  { value: "EDITOR", label: "Editor" },
  { value: "VIEWER", label: "Viewer" },
];

function removeSlashText(editor: Editor) {
  const { $from } = editor.state.selection;
  return editor
    .chain()
    .focus()
    .deleteRange({ from: $from.start(), to: $from.end() });
}

function decodeCollaborationState(value: string) {
  const binary = window.atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function PageWorkspace({
  pageId,
  documentFormatVersion = 1,
}: {
  pageId: string;
  documentFormatVersion?: 1 | 2;
}) {
  const router = useRouter();
  const hostRef = useRef<HTMLDivElement>(null);
  const autosave = useRef<PageAutosave | null>(null);
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
    | "comments"
    | "templates"
    | "history"
    | "backlinks"
    | "permissions"
    | "ai"
    | null
  >(null);
  const [comments, setComments] = useState<PageComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [templates, setTemplates] = useState<PageTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [proposals, setProposals] = useState<PageProposal[]>([]);
  const [revisions, setRevisions] = useState<PageRevision[]>([]);
  const [backlinks, setBacklinks] = useState<PageReference[]>([]);
  const [permissionOwnerId, setPermissionOwnerId] = useState("");
  const [permissionGrants, setPermissionGrants] = useState<
    PagePermissionGrant[]
  >([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>(
    []
  );
  const [publication, setPublication] = useState<PagePublication>({
    published: false,
    url: null,
  });
  const [mentionPages, setMentionPages] = useState<PageReference[]>([]);
  const [pendingMentionId, setPendingMentionId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiAction, setAiAction] = useState<AiAction>("rewrite");
  const canEdit = page?.accessRole !== "VIEWER";
  const canManageAccess = page?.accessRole === "FULL_ACCESS";
  const [collaborationStatus, setCollaborationStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [collaborators, setCollaborators] = useState<
    Array<{ name: string; color: string }>
  >([]);
  const collaborationDocument = useMemo(
    () => new Y.Doc({ guid: `page:${pageId}` }),
    [pageId]
  );
  const collaborationSocket = useMemo(
    () =>
      new HocuspocusProviderWebsocket({
        url: process.env.NEXT_PUBLIC_COLLABORATION_URL ?? "ws://localhost:1234",
        autoConnect: false,
      }),
    []
  );
  const collaborationProvider = useMemo(
    () =>
      new HocuspocusProvider({
        name: `page:${pageId}`,
        document: collaborationDocument,
        websocketProvider: collaborationSocket,
        token: null,
        onStatus: ({ status }) =>
          setCollaborationStatus(
            status === "connected"
              ? "connected"
              : status === "disconnected"
                ? "disconnected"
                : "connecting"
          ),
        onAwarenessChange: ({ states }) =>
          setCollaborators(
            states.flatMap((state) => {
              const user = state.user as
                | { name?: unknown; color?: unknown }
                | undefined;
              return typeof user?.name === "string" &&
                typeof user.color === "string"
                ? [{ name: user.name, color: user.color }]
                : [];
            })
          ),
      }),
    [collaborationDocument, collaborationSocket, pageId]
  );

  useEffect(() => {
    const draftKey = `needt-page-draft:${pageId}`;
    const queue = new PageAutosave({
      isOnline: () => navigator.onLine,
      onStateChange: setSaveState,
      persistDraft: (document) =>
        localStorage.setItem(draftKey, JSON.stringify(document)),
      removeDraft: () => localStorage.removeItem(draftKey),
      save: async (document) => {
        const response = await fetch(`/api/pages/${pageId}/blocks`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blocks: pageBlocksFromDocument(document),
            documentFormatVersion,
          }),
        });
        if (!response.ok) throw new Error("Save failed");
        window.dispatchEvent(new Event("pages-changed"));
      },
    });
    autosave.current = queue;
    return () => {
      queue.dispose();
      if (autosave.current === queue) autosave.current = null;
    };
  }, [documentFormatVersion, pageId]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        undoRedo: false,
      }),
      Placeholder.configure({
        placeholder: "Write anything, or type / for commands…",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      ImageExtension.configure({ allowBase64: false }),
      LinkExtension.configure({
        autolink: true,
        defaultProtocol: "https",
        openOnClick: false,
      }),
      TableKit.configure({ table: { resizable: true } }),
      BlockIdentity,
      PageBlockNode,
      Collaboration.configure({ document: collaborationDocument }),
      CollaborationCaret.configure({
        provider: collaborationProvider,
        user: { name: "Needt collaborator", color: "#4F46E5" },
      }),
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
      autosave.current?.schedule(document);

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
    void (async () => {
      const response = await fetch(`/api/pages/${pageId}`);
      if (!response.ok) {
        router.replace("/pages");
        return;
      }
      const { page: loaded } = (await response.json()) as { page: PageDetail };
      if (cancelled) return;
      setPage(loaded);
      const localDraft = localStorage.getItem(`needt-page-draft:${pageId}`);

      const tokenResponse = await fetch(
        `/api/pages/${pageId}/collaboration-token`,
        { method: "POST" }
      ).catch(() => null);
      if (cancelled) return;

      if (tokenResponse?.ok) {
        const collaboration =
          (await tokenResponse.json()) as CollaborationTokenResponse;
        Y.applyUpdate(
          collaborationDocument,
          decodeCollaborationState(collaboration.initialState)
        );
        collaborationSocket.setConfiguration({ url: collaboration.url });
        let nextToken: string | null = collaboration.token;
        collaborationProvider.setConfiguration({
          token: async () => {
            if (nextToken) {
              const currentToken = nextToken;
              nextToken = null;
              return currentToken;
            }
            const refreshed = await fetch(
              `/api/pages/${pageId}/collaboration-token`,
              { method: "POST" }
            );
            if (!refreshed.ok) {
              throw new Error("Page collaboration access denied");
            }
            const data = (await refreshed.json()) as CollaborationTokenResponse;
            return data.token;
          },
        });
        collaborationProvider.attach();
        editor.commands.updateUser(collaboration.user);
        if (localDraft) {
          try {
            editor.commands.setContent(JSON.parse(localDraft) as JSONContent, {
              emitUpdate: false,
            });
            setSaveState("failed");
          } catch {
            localStorage.removeItem(`needt-page-draft:${pageId}`);
          }
        }
        ensureBlockIds(editor);
        hydrated.current = true;
        if (localDraft) autosave.current?.schedule(editor.getJSON());
        void collaborationSocket
          .connect()
          .catch(() => setCollaborationStatus("disconnected"));
        return;
      }

      const document = documentFromPageBlocks(loaded.blocks);
      editor.commands.setContent(document || legacyPageHtml(loaded.blocks), {
        emitUpdate: false,
      });
      if (localDraft) {
        try {
          editor.commands.setContent(JSON.parse(localDraft) as JSONContent, {
            emitUpdate: false,
          });
          setSaveState("failed");
        } catch {
          localStorage.removeItem(`needt-page-draft:${pageId}`);
        }
      }
      ensureBlockIds(editor);
      hydrated.current = true;
      setCollaborationStatus("disconnected");
      if (localDraft) autosave.current?.schedule(editor.getJSON());
    })().catch(() => router.replace("/pages"));
    return () => {
      cancelled = true;
    };
  }, [
    collaborationDocument,
    collaborationProvider,
    collaborationSocket,
    editor,
    pageId,
    router,
  ]);

  useEffect(
    () => () => {
      collaborationProvider.destroy();
    },
    [collaborationProvider]
  );

  useEffect(
    () => () => {
      collaborationSocket.destroy();
      collaborationDocument.destroy();
    },
    [collaborationDocument, collaborationSocket]
  );

  useEffect(() => {
    editor?.setEditable(canEdit);
  }, [canEdit, editor]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (saveState !== "saved") event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [saveState]);

  useEffect(() => {
    const handleOffline = () => setSaveState("offline");
    const handleOnline = () => autosave.current?.retryWhenOnline();
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const patchPage = async (values: Record<string, unknown>) => {
    setPage((current) =>
      current ? ({ ...current, ...values } as PageDetail) : current
    );
    const response = await fetch(`/api/pages/${pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) notify.error("Could not update page");
    window.dispatchEvent(new Event("pages-changed"));
  };

  const createSubpage = async () => {
    const response = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled", parentId: pageId }),
    });
    if (!response.ok) {
      notify.error("Could not create subpage");
      return;
    }
    const data = (await response.json()) as { page?: { id: string } };
    if (!data.page?.id) return;
    window.dispatchEvent(new Event("pages-changed"));
    router.push(`/pages/${data.page.id}`);
  };

  const openTool = async (
    tool:
      | "comments"
      | "templates"
      | "history"
      | "backlinks"
      | "permissions"
      | "ai"
  ) => {
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
    if (tool === "history") {
      const response = await fetch(`/api/pages/${pageId}/revisions`);
      if (response.ok) {
        const data = (await response.json()) as { revisions: PageRevision[] };
        setRevisions(data.revisions);
      }
    }
    if (tool === "backlinks") {
      const response = await fetch(`/api/pages/${pageId}/backlinks`);
      if (response.ok) {
        const data = (await response.json()) as { backlinks: PageReference[] };
        setBacklinks(data.backlinks);
      }
    }
    if (tool === "permissions") {
      const [permissionsResponse, membersResponse, publicationResponse] =
        await Promise.all([
          fetch(`/api/pages/${pageId}/permissions`),
          page?.workspaceId
            ? fetch(`/api/workspaces/${page.workspaceId}/members`)
            : Promise.resolve(null),
          fetch(`/api/pages/${pageId}/publication`),
        ]);
      if (permissionsResponse.ok) {
        const data = (await permissionsResponse.json()) as {
          ownerId: string;
          grants: PagePermissionGrant[];
        };
        setPermissionOwnerId(data.ownerId);
        setPermissionGrants(data.grants);
      }
      if (membersResponse?.ok) {
        const data = (await membersResponse.json()) as {
          members: WorkspaceMember[];
        };
        setWorkspaceMembers(data.members);
      } else {
        setWorkspaceMembers([]);
      }
      if (publicationResponse.ok) {
        setPublication((await publicationResponse.json()) as PagePublication);
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

  const setMemberPermission = async (userId: string, role: string) => {
    const inherited = role === "INHERITED";
    const response = await fetch(`/api/pages/${pageId}/permissions`, {
      method: inherited ? "DELETE" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...(inherited ? {} : { role }) }),
    });
    if (!response.ok) {
      notify.error("Could not update Page access");
      return;
    }
    if (inherited) {
      setPermissionGrants((current) =>
        current.filter((grant) => grant.userId !== userId)
      );
      return;
    }
    const data = (await response.json()) as { grant: PagePermissionGrant };
    setPermissionGrants((current) => [
      ...current.filter((grant) => grant.userId !== userId),
      data.grant,
    ]);
  };

  const publishPublicLink = async () => {
    const response = await fetch(`/api/pages/${pageId}/publication`, {
      method: "POST",
    });
    if (!response.ok) {
      notify.error("Could not publish this Page");
      return;
    }
    setPublication((await response.json()) as PagePublication);
  };

  const unpublishPublicLink = async () => {
    const response = await fetch(`/api/pages/${pageId}/publication`, {
      method: "DELETE",
    });
    if (!response.ok) {
      notify.error("Could not unpublish this Page");
      return;
    }
    setPublication((await response.json()) as PagePublication);
    notify.success("Public link disabled");
  };

  const copyPublicLink = async () => {
    if (!publication.url) return;
    try {
      await navigator.clipboard.writeText(publication.url);
      notify.success("Public link copied");
    } catch {
      notify.error("Could not copy the public link");
    }
  };

  const restoreRevision = async (revisionId: string) => {
    const response = await fetch(`/api/pages/${pageId}/revisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revisionId }),
    });
    if (!response.ok) {
      notify.error("Could not restore this version");
      return;
    }
    notify.success("Page version restored");
    window.location.reload();
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    const response = await fetch(`/api/pages/${pageId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentText }),
    });
    if (!response.ok) {
      notify.error("Could not add comment");
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
      notify.error("Could not save template");
      return;
    }
    const data = (await response.json()) as { template: PageTemplate };
    setTemplates((current) => [
      data.template,
      ...current.filter((item) => item.id !== data.template.id),
    ]);
    setTemplateName("");
    notify.success("Template saved");
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
      notify.error("Could not create page from template");
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
        message: `Use propose_page_changes for pageId "${pageId}". Action: ${aiAction}. ${aiPrompt}`,
      }),
    });
    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      notify.error(
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
      notify.error("Could not update proposal");
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
          blockId: randomId(),
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
        notify.error(
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
        notify.error(data.error || "Could not create form");
        return;
      }
      insertSpecial("FORM", data.form.title, {
        formId: data.form.id,
        title: data.form.title,
      });
      return;
    }
    if (pendingInsert === "PAGE_MENTION") {
      const target = mentionPages.find((page) => page.id === pendingMentionId);
      if (!target) return;
      insertSpecial("PAGE_MENTION", target.title, {
        pageId: target.id,
        title: target.title,
        url: `/pages/${target.id}`,
      });
      setPendingMentionId(null);
      return;
    }
    if (
      pendingInsert === "TASK_REFERENCE" ||
      pendingInsert === "PROJECT_REFERENCE"
    ) {
      const response = await fetch(`/api/pages/${pageId}/entities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: pendingInsert === "TASK_REFERENCE" ? "task" : "project",
          title: pendingValue,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        entity?: { id: string; title: string; href: string };
        error?: string;
      };
      if (!response.ok || !data.entity) {
        notify.error(data.error || "Could not create workspace entity");
        return;
      }
      insertSpecial(pendingInsert, data.entity.title, {
        entityId: data.entity.id,
        title: data.entity.title,
        url: data.entity.href,
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
      command === "COLUMNS" ||
      command === "PAGE_MENTION" ||
      command === "TASK_REFERENCE" ||
      command === "PROJECT_REFERENCE" ||
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
      if (command === "PAGE_MENTION") {
        void fetch("/api/pages/search?q=")
          .then((response) =>
            response.ok ? response.json() : ({ pages: [] } as const)
          )
          .then((data: { pages?: PageReference[] }) =>
            setMentionPages(
              (data.pages ?? []).filter((candidate) => candidate.id !== pageId)
            )
          )
          .catch(() => setMentionPages([]));
        setPendingMentionId(null);
      }
      const { $from } = editor.state.selection;
      pendingRange.current = { from: $from.start(), to: $from.end() };
      setPendingInsert(command);
      setPendingFile(null);
      setPendingValue(
        command === "DATE_MENTION"
          ? new Date().toISOString().slice(0, 10)
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
    else if (command === "TABLE")
      chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
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
    <div className="min-h-dvh bg-[var(--surface-canvas)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-20 flex h-11 items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-3">
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
        <div
          className="hidden items-center -space-x-1 sm:flex"
          aria-label={`${collaborators.length} active collaborators`}
        >
          {collaborators.slice(0, 3).map((collaborator, index) => (
            <span
              key={`${collaborator.name}-${index}`}
              className="h-5 w-5 rounded-full border-2 border-[var(--surface-canvas)]"
              style={{ backgroundColor: collaborator.color }}
              title={collaborator.name}
            />
          ))}
        </div>
        <span className="text-[11px] text-[var(--text-muted)]">
          {collaborationStatus === "connected"
            ? "Live · "
            : collaborationStatus === "connecting"
              ? "Connecting · "
              : "Offline · "}
          {saveState === "saving"
            ? "Saving…"
            : saveState === "offline"
              ? "Draft kept"
              : saveState === "failed"
                ? "Draft kept"
                : "Saved"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!canEdit || !editor?.can().undo()}
          aria-label="Undo"
        >
          <Undo2 />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!canEdit || !editor?.can().redo()}
          aria-label="Redo"
        >
          <Redo2 />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void patchPage({ isFavorite: !page.isFavorite })}
          disabled={!canEdit}
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
            disabled={!canManageAccess}
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
            {canManageAccess && (
              <button
                type="button"
                onClick={() => void openTool("permissions")}
                className="flex h-9 w-full items-center gap-2 rounded-[var(--control-radius)] px-2.5 text-[13px] hover:bg-[var(--menu-item-hover)]"
              >
                <ShieldCheck className="h-4 w-4 text-[var(--text-muted)]" />
                Share &amp; permissions
              </button>
            )}
            <button
              type="button"
              onClick={() => void createSubpage()}
              disabled={!canEdit}
              className="flex h-9 w-full items-center gap-2 rounded-[var(--control-radius)] px-2.5 text-[13px] hover:bg-[var(--menu-item-hover)] disabled:opacity-40"
            >
              <FilePlus className="h-4 w-4 text-[var(--text-muted)]" />
              New subpage
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
              onClick={() => void openTool("history")}
              className="flex h-9 w-full items-center gap-2 rounded-[var(--control-radius)] px-2.5 text-[13px] hover:bg-[var(--menu-item-hover)]"
            >
              <History className="h-4 w-4 text-[var(--text-muted)]" />
              Version history
            </button>
            <button
              type="button"
              onClick={() => void openTool("backlinks")}
              className="flex h-9 w-full items-center gap-2 rounded-[var(--control-radius)] px-2.5 text-[13px] hover:bg-[var(--menu-item-hover)]"
            >
              <Link2 className="h-4 w-4 text-[var(--text-muted)]" />
              Backlinks
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
          disabled={!canEdit}
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
            disabled={!canEdit}
            onClick={() => void patchPage({ icon: page.icon ? null : "📄" })}
            className="rounded px-1.5 py-1 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-40"
          >
            {page.icon ? "Remove icon" : "Add icon"}
          </button>
          {!page.coverUrl && (
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => {
                setCoverUrl("");
                setCoverOpen(true);
              }}
              className="rounded px-1.5 py-1 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-40"
            >
              Add cover
            </button>
          )}
        </div>
        {page.icon && <div className="mb-2 text-5xl">{page.icon}</div>}
        <input
          value={page.title}
          readOnly={!canEdit}
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
          ) : pendingInsert === "PAGE_MENTION" ? (
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {mentionPages.length === 0 && (
                <p className="py-3 text-center text-[12px] text-[var(--text-muted)]">
                  No other Pages to mention.
                </p>
              )}
              {mentionPages.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => setPendingMentionId(candidate.id)}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-2 rounded-[var(--control-radius)] px-3 text-left text-[13px] hover:bg-[var(--surface-hover)]",
                    pendingMentionId === candidate.id &&
                      "bg-[var(--surface-hover)]"
                  )}
                >
                  <FileText className="h-4 w-4 text-[var(--text-muted)]" />
                  <span className="truncate">{candidate.title}</span>
                </button>
              ))}
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
                  : pendingInsert === "PAGE_MENTION"
                    ? !pendingMentionId
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
            <div className="flex flex-wrap gap-1.5" aria-label="AI page action">
              {(
                [
                  ["rewrite", "Rewrite"],
                  ["summarize", "Summarize"],
                  ["critique", "Critique"],
                ] as const
              ).map(([action, label]) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => setAiAction(action)}
                  className={cn(
                    "min-h-9 rounded-[var(--control-radius)] border border-[var(--border-control)] px-3 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]",
                    aiAction === action &&
                      "bg-[var(--text-primary)] text-[var(--surface-canvas)]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
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
        open={toolOpen === "permissions"}
        onOpenChange={(open) => !open && setToolOpen(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Share &amp; permissions</DialogTitle>
            <DialogDescription>
              A direct Page role overrides the member&apos;s workspace role.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[420px] space-y-1 overflow-y-auto">
            {workspaceMembers.length === 0 && (
              <div className="rounded-[var(--control-radius)] border border-[var(--border-subtle)] px-3 py-4 text-[13px] text-[var(--text-secondary)]">
                This personal Page is only available to its owner.
              </div>
            )}
            {workspaceMembers.map((member) => {
              const grant = permissionGrants.find(
                (candidate) => candidate.userId === member.userId
              );
              const isOwner = member.userId === permissionOwnerId;
              return (
                <div
                  key={member.userId}
                  className="flex min-h-12 items-center gap-3 rounded-[var(--control-radius)] px-2.5 hover:bg-[var(--surface-hover)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">
                      {member.user.name || member.user.email || "Member"}
                    </div>
                    <div className="truncate text-[11px] text-[var(--text-muted)]">
                      {isOwner
                        ? "Page owner"
                        : `${member.role.toLowerCase()} in workspace`}
                    </div>
                  </div>
                  {isOwner ? (
                    <span className="text-[12px] text-[var(--text-secondary)]">
                      Full access
                    </span>
                  ) : (
                    <NeedtPicker
                      ariaLabel={`Access for ${member.user.name || member.user.email || "member"}`}
                      options={PAGE_PERMISSION_OPTIONS}
                      value={grant?.role ?? "INHERITED"}
                      onValueChange={(role) =>
                        void setMemberPermission(member.userId, role)
                      }
                      align="end"
                      triggerVariant="field"
                      className="w-36"
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="border-t border-[var(--border-subtle)] pt-4">
            <div className="mb-3">
              <div className="text-[13px] font-medium">Public link</div>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                Anyone with this separate link can read the Page. They cannot
                edit it or access the workspace.
              </p>
            </div>
            {publication.published && publication.url ? (
              <div className="space-y-2">
                <Input
                  aria-label="Published Page link"
                  value={publication.url}
                  readOnly
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void unpublishPublicLink()}
                  >
                    Unpublish
                  </Button>
                  <Button onClick={() => void copyPublicLink()}>
                    Copy link
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button onClick={() => void publishPublicLink()}>
                  Publish Page
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={toolOpen === "history"}
        onOpenChange={(open) => !open && setToolOpen(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Version history</DialogTitle>
            <DialogDescription>
              Restoring a version keeps your current document as a new revision.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[360px] space-y-1 overflow-y-auto">
            {revisions.length === 0 && (
              <div className="py-6 text-center text-[12px] text-[var(--text-muted)]">
                No saved versions yet.
              </div>
            )}
            {revisions.map((revision) => (
              <div
                key={revision.id}
                className="flex min-h-11 items-center gap-3 rounded-[var(--control-radius)] px-2.5 hover:bg-[var(--surface-hover)]"
              >
                <History className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="min-w-0 flex-1 text-[13px]">
                  {new Date(revision.createdAt).toLocaleString()} ·{" "}
                  {revision.createdBy === "AI" ? "AI" : "You"}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void restoreRevision(revision.id)}
                >
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={toolOpen === "backlinks"}
        onOpenChange={(open) => !open && setToolOpen(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Backlinks</DialogTitle>
            <DialogDescription>
              Pages that reference this document.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[360px] space-y-1 overflow-y-auto">
            {backlinks.length === 0 && (
              <div className="py-6 text-center text-[12px] text-[var(--text-muted)]">
                No Pages link here yet.
              </div>
            )}
            {backlinks.map((backlink) => (
              <button
                key={backlink.id}
                type="button"
                onClick={() => router.push(`/pages/${backlink.id}`)}
                className="flex min-h-11 w-full items-center gap-2 rounded-[var(--control-radius)] px-3 text-left text-[13px] hover:bg-[var(--surface-hover)]"
              >
                <FileText className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="truncate">{backlink.title}</span>
              </button>
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
              placeholder={`Describe what should be ${aiAction}…`}
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
