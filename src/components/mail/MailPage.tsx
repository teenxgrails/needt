"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import {
  Archive,
  ArrowLeft,
  ChevronRight,
  Circle,
  ImageIcon,
  Inbox,
  Mail,
  MailOpen,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

const LOG_SOURCE = "MailPage";

type MailProvider = "GMAIL" | "OUTLOOK" | "IMAP";
type MailStatus = "ACTIVE" | "ERROR" | "DISCONNECTED";

interface MailAccountItem {
  id: string;
  provider: MailProvider;
  address: string;
  status: MailStatus;
  lastSyncAt: string | null;
  _count: { messages: number };
}

interface MailMessageItem {
  id: string;
  accountId: string;
  externalId: string;
  fromName: string | null;
  fromAddress: string | null;
  subject: string;
  snippet: string;
  date: string;
  isRead: boolean;
  isArchived: boolean;
  bodyHtml: string | null;
  account: Pick<MailAccountItem, "id" | "provider" | "address" | "status">;
}

interface OpenMailMessage extends MailMessageItem {
  hasRemoteImages: boolean;
}

interface MailOAuthAvailability {
  google: { configured: boolean };
  outlook: { configured: boolean };
}

const NO_MAIL_OAUTH: MailOAuthAvailability = {
  google: { configured: false },
  outlook: { configured: false },
};

function providerLabel(provider: MailProvider) {
  if (provider === "GMAIL") return "Gmail";
  if (provider === "OUTLOOK") return "Outlook";
  return "IMAP";
}

function messageTime(value: string) {
  const date = newDate(value);
  const now = newDate();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function revealRemoteImages(html: string): string {
  const document = new DOMParser().parseFromString(html, "text/html");
  for (const image of document.querySelectorAll<HTMLImageElement>(
    "img[data-remote-src]"
  )) {
    const source = image.dataset.remoteSrc;
    if (!source) continue;
    try {
      const url = new URL(source);
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
      image.src = url.toString();
      image.removeAttribute("data-remote-src");
    } catch {
      image.removeAttribute("data-remote-src");
    }
  }
  return document.body.innerHTML;
}

export function MailPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<MailAccountItem[]>([]);
  const [messages, setMessages] = useState<MailMessageItem[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openMessage, setOpenMessage] = useState<OpenMailMessage | null>(null);
  const [loadedImages, setLoadedImages] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [oauthAvailability, setOAuthAvailability] =
    useState<MailOAuthAvailability>(NO_MAIL_OAUTH);
  const [mobilePane, setMobilePane] = useState<
    "accounts" | "messages" | "message"
  >("messages");

  const loadAccounts = useCallback(async () => {
    const response = await fetch("/api/mail/accounts");
    if (!response.ok) throw new Error("Could not load mail accounts.");
    setAccounts((await response.json()) as MailAccountItem[]);
  }, []);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedAccount) params.set("accountId", selectedAccount);
      const response = await fetch(`/api/mail/messages?${params}`);
      if (!response.ok) throw new Error("Could not load messages.");
      const data = (await response.json()) as {
        messages: MailMessageItem[];
      };
      setMessages(data.messages);
      if (
        selectedId &&
        !data.messages.some((message) => message.id === selectedId)
      ) {
        setSelectedId(null);
        setOpenMessage(null);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, selectedId]);

  useEffect(() => {
    void Promise.all([loadAccounts(), loadMessages()]).catch((error) => {
      void logger.error(
        "Failed to load the inbox",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
      toast.error("Could not load Mail");
    });
  }, [loadAccounts, loadMessages]);

  useEffect(() => {
    void fetch("/api/integration-status")
      .then((response) =>
        response.ok
          ? (response.json() as Promise<MailOAuthAvailability>)
          : NO_MAIL_OAUTH
      )
      .then(setOAuthAvailability)
      .catch(() => setOAuthAvailability(NO_MAIL_OAUTH));
  }, []);

  const openMail = async (message: MailMessageItem) => {
    setSelectedId(message.id);
    setLoadedImages(false);
    setMobilePane("message");
    const response = await fetch(`/api/mail/messages/${message.id}`);
    if (!response.ok) {
      toast.error("Could not open this message");
      return;
    }
    const detail = (await response.json()) as OpenMailMessage;
    setOpenMessage(detail);
    if (!detail.isRead) {
      await updateMessage(detail, { isRead: true }, false);
    }
  };

  const updateMessage = async (
    message: MailMessageItem,
    action: { isRead?: boolean; archive?: boolean },
    announce = true
  ) => {
    const response = await fetch(`/api/mail/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action),
    });
    if (!response.ok) {
      if (announce) toast.error("Could not update this message");
      return;
    }
    setMessages((current) =>
      action.archive
        ? current.filter((item) => item.id !== message.id)
        : current.map((item) =>
            item.id === message.id
              ? {
                  ...item,
                  ...(action.isRead !== undefined && { isRead: action.isRead }),
                }
              : item
          )
    );
    setOpenMessage((current) =>
      current?.id === message.id
        ? {
            ...current,
            ...(action.isRead !== undefined && { isRead: action.isRead }),
            ...(action.archive && { isArchived: true }),
          }
        : current
    );
    await loadAccounts();
    window.dispatchEvent(new Event("mail-unread-changed"));
    if (action.archive) {
      setSelectedId(null);
      setOpenMessage(null);
      setMobilePane("messages");
      if (announce) toast.success("Message archived");
    }
  };

  const syncMail = async () => {
    setSyncing(true);
    const response = await fetch("/api/mail/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: selectedAccount }),
    });
    setSyncing(false);
    if (response.ok) {
      toast.success("Mail sync queued");
    } else {
      toast.error("Could not queue mail sync");
    }
  };

  const createTask = async (message: MailMessageItem) => {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: message.subject,
        description: `Created from email: /mail?message=${message.id}`,
        status: "todo",
      }),
    });
    if (!response.ok) {
      toast.error("Could not create task");
      return;
    }
    const task = (await response.json()) as { id: string };
    toast.success("Task created from email");
    router.push(`/tasks?task=${task.id}`);
  };

  const renderedBody = useMemo(() => {
    const body = openMessage?.bodyHtml || "";
    return loadedImages ? revealRemoteImages(body) : body;
  }, [loadedImages, openMessage?.bodyHtml]);

  return (
    <div className="needt-page-depth flex h-full min-h-0 overflow-hidden text-[var(--text-primary)]">
      <aside
        className={cn(
          "needt-panel-depth w-[220px] flex-none border-r border-[var(--border-subtle)] max-xl:w-full",
          mobilePane !== "accounts" && "max-xl:hidden"
        )}
      >
        <div className="flex h-16 items-center border-b border-[var(--border-subtle)] px-3">
          <Mail className="mr-2 h-4 w-4 text-[var(--text-secondary)]" />
          <h1 className="text-[14px] font-semibold">Mail</h1>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-11 w-11 xl:h-8 xl:w-8"
            onClick={() => setConnectOpen(true)}
            aria-label="Connect mail account"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="h-[calc(100%_-_4rem)]">
          <nav className="space-y-1 p-2" aria-label="Mail accounts">
            <button
              type="button"
              onClick={() => {
                setSelectedAccount(null);
                setMobilePane("messages");
              }}
              className={cn(
                "flex min-h-11 w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors duration-150 hover:bg-[var(--surface-hover)] xl:min-h-9",
                !selectedAccount && "bg-[var(--surface-hover)]"
              )}
            >
              <Inbox className="h-4 w-4 text-[var(--text-secondary)]" />
              <span className="flex-1">All inboxes</span>
              <span className="text-[11px] text-[var(--text-muted)]">
                {accounts.reduce(
                  (total, account) => total + account._count.messages,
                  0
                )}
              </span>
            </button>
            {accounts.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => {
                  setSelectedAccount(account.id);
                  setMobilePane("messages");
                }}
                className={cn(
                  "flex min-h-11 w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors duration-150 hover:bg-[var(--surface-hover)] xl:min-h-9",
                  selectedAccount === account.id && "bg-[var(--surface-hover)]"
                )}
              >
                <Circle
                  className={cn(
                    "h-2.5 w-2.5 fill-current",
                    account.status === "ERROR"
                      ? "text-[var(--text-muted)]"
                      : "text-[var(--color-accent)]"
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{account.address}</span>
                  <span className="block text-[10px] text-[var(--text-muted)]">
                    {account.status === "ERROR"
                      ? "Sync needs attention"
                      : providerLabel(account.provider)}
                  </span>
                </span>
                {account._count.messages > 0 && (
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    {account._count.messages}
                  </span>
                )}
              </button>
            ))}
            {!accounts.length && (
              <div className="px-2 py-8 text-center">
                <ShieldCheck className="mx-auto mb-2 h-5 w-5 text-[var(--text-muted)]" />
                <p className="text-[12px] text-[var(--text-secondary)]">
                  No mail account connected
                </p>
                <button
                  type="button"
                  className="mt-2 text-[12px] text-[var(--color-accent)] hover:underline"
                  onClick={() => setConnectOpen(true)}
                >
                  Connect an account
                </button>
              </div>
            )}
          </nav>
        </ScrollArea>
      </aside>

      <section
        className={cn(
          "w-[360px] flex-none border-r border-[var(--border-subtle)] max-xl:w-full",
          mobilePane !== "messages" && "max-xl:hidden"
        )}
      >
        <header className="flex h-16 items-center gap-1 border-b border-[var(--border-subtle)] px-2">
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-11 w-11 max-xl:inline-flex"
            onClick={() => setMobilePane("accounts")}
            aria-label="Show mail accounts"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
          <span className="min-w-0 flex-1 truncate px-1 text-[13px] font-medium">
            {selectedAccount
              ? accounts.find((account) => account.id === selectedAccount)
                  ?.address
              : "All inboxes"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 xl:h-8 xl:w-8"
            onClick={() => void syncMail()}
            disabled={syncing || !accounts.length}
            aria-label="Sync mail"
          >
            <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
          </Button>
        </header>
        <ScrollArea className="h-[calc(100%_-_4rem)]">
          {loading ? (
            <div className="p-6 text-center text-[12px] text-[var(--text-muted)]">
              Loading inbox...
            </div>
          ) : messages.length ? (
            <div role="list">
              {messages.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  role="listitem"
                  onClick={() => void openMail(message)}
                  className={cn(
                    "group flex min-h-16 w-full gap-2 border-b border-[var(--border-subtle)] px-3 py-2.5 text-left transition-colors duration-150 hover:bg-[var(--surface-hover)] xl:min-h-10 xl:py-1",
                    selectedId === message.id && "bg-[var(--surface-hover)]"
                  )}
                >
                  <span className="pt-1.5">
                    <span
                      className={cn(
                        "block h-1.5 w-1.5 rounded-full",
                        message.isRead
                          ? "bg-transparent"
                          : "bg-[var(--color-accent)]"
                      )}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-[12px]",
                          !message.isRead && "font-semibold"
                        )}
                      >
                        {message.fromName ||
                          message.fromAddress ||
                          "Unknown sender"}
                      </span>
                      <time className="text-[10px] text-[var(--text-muted)]">
                        {messageTime(message.date)}
                      </time>
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block truncate text-[12px]",
                        message.isRead
                          ? "text-[var(--text-secondary)]"
                          : "font-medium"
                      )}
                    >
                      {message.subject}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)] xl:hidden">
                      {message.snippet}
                    </span>
                  </span>
                  <ChevronRight className="mt-4 hidden h-3.5 w-3.5 text-[var(--text-muted)] max-xl:block" />
                </button>
              ))}
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <Inbox className="mx-auto mb-3 h-7 w-7 text-[var(--text-muted)]" />
              <p className="text-[13px] font-medium">
                {accounts.length ? "Inbox zero" : "Mail is not configured"}
              </p>
              <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                {accounts.length
                  ? "New messages will appear after the next sync."
                  : "Connect Gmail, Outlook, or any IMAP account."}
              </p>
              {!accounts.length && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setConnectOpen(true)}
                >
                  Connect mail
                </Button>
              )}
            </div>
          )}
        </ScrollArea>
      </section>

      <main
        className={cn(
          "min-w-0 flex-1 max-xl:w-full",
          mobilePane !== "message" && "max-xl:hidden"
        )}
      >
        {openMessage ? (
          <div className="flex h-full min-h-0 flex-col">
            <header className="flex h-16 flex-none items-center gap-1 border-b border-[var(--border-subtle)] px-2">
              <Button
                variant="ghost"
                size="icon"
                className="hidden h-11 w-11 max-xl:inline-flex"
                onClick={() => setMobilePane("messages")}
                aria-label="Back to messages"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-11 gap-1.5 text-[12px] xl:h-8"
                onClick={() =>
                  void updateMessage(openMessage, {
                    isRead: !openMessage.isRead,
                  })
                }
              >
                {openMessage.isRead ? (
                  <Mail className="h-3.5 w-3.5" />
                ) : (
                  <MailOpen className="h-3.5 w-3.5" />
                )}
                <span className="max-sm:hidden">
                  Mark {openMessage.isRead ? "unread" : "read"}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-11 gap-1.5 text-[12px] xl:h-8"
                onClick={() =>
                  void updateMessage(openMessage, { archive: true })
                }
              >
                <Archive className="h-3.5 w-3.5" />
                <span className="max-sm:hidden">Archive</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-11 gap-1.5 text-[12px] xl:h-8"
                onClick={() => void createTask(openMessage)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Create task
              </Button>
            </header>
            <ScrollArea className="min-h-0 flex-1">
              <article className="mx-auto max-w-3xl px-6 py-5 max-sm:px-4">
                <h2 className="text-[18px] font-semibold leading-6">
                  {openMessage.subject}
                </h2>
                <div className="mt-3 flex items-start gap-3 border-b border-[var(--border-subtle)] pb-4">
                  <div className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[var(--surface-raised)] text-[12px] font-semibold">
                    {(openMessage.fromName || openMessage.fromAddress || "?")
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium">
                      {openMessage.fromName || openMessage.fromAddress}
                    </p>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">
                      {openMessage.fromAddress}
                    </p>
                  </div>
                  <time className="text-[11px] text-[var(--text-muted)]">
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(newDate(openMessage.date))}
                  </time>
                </div>
                {openMessage.hasRemoteImages && !loadedImages && (
                  <div className="mt-4 flex items-center gap-2 rounded-md border border-[var(--border-control)] bg-[var(--surface-raised)] px-3 py-2 text-[11px] text-[var(--text-secondary)]">
                    <ImageIcon className="h-3.5 w-3.5" />
                    Remote images are blocked for privacy.
                    <button
                      type="button"
                      className="ml-auto font-medium text-[var(--text-primary)] hover:underline"
                      onClick={() => setLoadedImages(true)}
                    >
                      Load images
                    </button>
                  </div>
                )}
                <div
                  className="mail-message-body mt-5 overflow-hidden text-[13px] leading-6 text-[var(--text-primary)] [&_a]:text-[var(--color-accent)] [&_a]:underline [&_img]:max-w-full [&_table]:max-w-full"
                  dangerouslySetInnerHTML={{ __html: renderedBody }}
                />
              </article>
            </ScrollArea>
          </div>
        ) : (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <MailOpen className="mx-auto mb-3 h-8 w-8 text-[var(--text-muted)]" />
              <p className="text-[13px] font-medium">Select a message</p>
              <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                Its body is fetched securely when you open it.
              </p>
            </div>
          </div>
        )}
      </main>

      <ConnectMailDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        oauthAvailability={oauthAvailability}
        onConnected={async () => {
          await loadAccounts();
          setConnectOpen(false);
        }}
      />
    </div>
  );
}

function ConnectMailDialog({
  open,
  onOpenChange,
  oauthAvailability,
  onConnected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oauthAvailability: MailOAuthAvailability;
  onConnected: () => Promise<void>;
}) {
  const [showImap, setShowImap] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [secure, setSecure] = useState(true);

  const connectImap = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/mail/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: form.get("address"),
        host: form.get("host"),
        port: Number(form.get("port")),
        secure,
        username: form.get("username"),
        password: form.get("password"),
      }),
    });
    setSubmitting(false);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      toast.error(data.error || "Could not connect IMAP");
      return;
    }
    toast.success("IMAP account connected");
    await onConnected();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect mail</DialogTitle>
          <DialogDescription>
            Messages sync into Needt and are read from the local database.
          </DialogDescription>
        </DialogHeader>
        {!showImap ? (
          <div className="space-y-2 py-2">
            <Button
              asChild={oauthAvailability.google.configured}
              variant="outline"
              className="w-full justify-start"
              disabled={!oauthAvailability.google.configured}
            >
              {oauthAvailability.google.configured ? (
                <a href="/api/mail/oauth/google/auth">
                  <Mail className="mr-2 h-4 w-4" />
                  Continue with Gmail
                </a>
              ) : (
                <span>
                  <Mail className="mr-2 h-4 w-4" />
                  Gmail is not configured
                </span>
              )}
            </Button>
            <Button
              asChild={oauthAvailability.outlook.configured}
              variant="outline"
              className="w-full justify-start"
              disabled={!oauthAvailability.outlook.configured}
            >
              {oauthAvailability.outlook.configured ? (
                <a href="/api/mail/oauth/outlook/auth">
                  <Mail className="mr-2 h-4 w-4" />
                  Continue with Outlook
                </a>
              ) : (
                <span>
                  <Mail className="mr-2 h-4 w-4" />
                  Outlook is not configured
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowImap(true)}
            >
              <Settings2 className="mr-2 h-4 w-4" />
              Connect another account with IMAP
            </Button>
          </div>
        ) : (
          <form className="space-y-3 py-1" onSubmit={connectImap}>
            <div className="space-y-1.5">
              <Label htmlFor="mail-address">Email address</Label>
              <Input id="mail-address" name="address" type="email" required />
            </div>
            <div className="grid grid-cols-[1fr_92px] gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="mail-host">IMAP host</Label>
                <Input
                  id="mail-host"
                  name="host"
                  placeholder="imap.example.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mail-port">Port</Label>
                <Input
                  id="mail-port"
                  name="port"
                  type="number"
                  defaultValue={993}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mail-username">Username</Label>
              <Input id="mail-username" name="username" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mail-password">App password</Label>
              <Input
                id="mail-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--border-subtle)] px-3 py-2">
              <Label htmlFor="mail-tls" className="text-[12px] font-normal">
                Use TLS
              </Label>
              <Switch
                id="mail-tls"
                checked={secure}
                onCheckedChange={setSecure}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowImap(false)}
              >
                Back
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Connecting..." : "Connect"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
