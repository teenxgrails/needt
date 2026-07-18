"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import {
  CalendarCheck,
  PanelLeftClose,
  Plus,
  RotateCcw,
  Search,
  Send,
} from "lucide-react";

import { APP_NAME } from "@/lib/app-config";
import { newDate } from "@/lib/date-utils";

interface AiMessage {
  id: string;
  role: string;
  content: string;
  requiresConfirm?: boolean;
}

interface AiConversation {
  id: string;
  title: string;
  createdAt: string;
  messages: AiMessage[];
}

interface AISettingsResponse {
  provider: string;
  hasApiKey: boolean;
  hostedAvailable?: boolean;
  usage?: {
    used: number;
    limit: number;
    remaining: number;
    allowed: boolean;
  };
}

interface RescheduleChange {
  taskId: string;
  title: string;
  fromStart: string | null;
  toStart: string | null;
}

interface ReschedulePreview {
  changes: RescheduleChange[];
  previewToken: string;
}

interface AIChatSurfaceProps {
  compact?: boolean;
}

const prompts = [
  "What should I work on next?",
  "Plan my week",
  "Reschedule my day",
  "Summarize my day",
];

export function AIChatSurface({ compact = false }: AIChatSurfaceProps) {
  const [settings, setSettings] = useState<AISettingsResponse | null>(null);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);
  const [preview, setPreview] = useState<ReschedulePreview | null>(null);
  const [undoToken, setUndoToken] = useState<string | null>(null);
  const [showBriefing, setShowBriefing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(!compact);

  const active = conversations.find((item) => item.id === activeId) || null;
  const messages = active?.messages || [];
  const canChat = Boolean(
    settings?.hasApiKey ||
      (settings?.hostedAvailable && settings.usage?.allowed)
  );

  useEffect(() => {
    fetch("/api/ai-settings")
      .then((response) => response.json())
      .then(setSettings)
      .catch(() =>
        setSettings({
          provider: "NONE",
          hasApiKey: false,
          hostedAvailable: false,
        })
      );
    fetch("/api/ai/conversations")
      .then((response) => response.json())
      .then((data) => {
        setConversations(data.conversations || []);
        setActiveId(data.conversations?.[0]?.id || null);
      })
      .catch(() => undefined);
    const today = newDate().toISOString().slice(0, 10);
    setShowBriefing(localStorage.getItem("lastBriefingAt") !== today);
    const prompt = new URLSearchParams(window.location.search).get("prompt");
    if (prompt) setInput(prompt);
  }, []);

  const grouped = useMemo(() => {
    return conversations.reduce<Record<string, AiConversation[]>>(
      (acc, item) => {
        const day = newDate(item.createdAt).toLocaleDateString();
        acc[day] = acc[day] || [];
        acc[day].push(item);
        return acc;
      },
      {}
    );
  }, [conversations]);

  async function newChat() {
    const response = await fetch("/api/ai/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New chat" }),
    });
    if (!response.ok) return;
    const data = await response.json();
    setConversations((current) => [data.conversation, ...current]);
    setActiveId(data.conversation.id);
  }

  async function send(message = input, confirmed = false) {
    const trimmed = message.trim();
    if (!trimmed || !canChat || streaming) return;
    setInput("");
    setPendingConfirm(null);
    setStreaming(true);

    const tempUser: AiMessage = {
      id: `user-${newDate().getTime()}`,
      role: "user",
      content: trimmed,
    };
    const tempAssistant: AiMessage = {
      id: `assistant-${newDate().getTime()}`,
      role: "assistant",
      content: "",
    };
    setConversations((current) => {
      const targetId = activeId || "pending";
      if (!activeId) {
        return [
          {
            id: targetId,
            title: trimmed.slice(0, 42),
            createdAt: newDate().toISOString(),
            messages: [tempUser, tempAssistant],
          },
          ...current,
        ];
      }
      return current.map((item) =>
        item.id === activeId
          ? { ...item, messages: [...item.messages, tempUser, tempAssistant] }
          : item
      );
    });
    if (!activeId) setActiveId("pending");

    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: activeId === "pending" ? undefined : activeId,
        message: trimmed,
        confirmed,
      }),
    });

    if (!response.ok || !response.body) {
      setStreaming(false);
      return;
    }
    setSettings((current) =>
      current?.usage && !current.hasApiKey
        ? {
            ...current,
            usage: {
              ...current.usage,
              used: current.usage.used + 1,
              remaining: Math.max(0, current.usage.remaining - 1),
              allowed: current.usage.remaining > 1,
            },
          }
        : current
    );

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistantText = "";
    let conversationId = activeId;
    let requiresConfirm = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line) as {
          type: "meta" | "token";
          value?: string;
          conversationId?: string;
          requiresConfirm?: boolean;
          toolName?: string | null;
          toolPayload?: unknown;
        };
        if (event.type === "meta") {
          conversationId = event.conversationId || conversationId;
          requiresConfirm = Boolean(event.requiresConfirm);
          if (event.toolName === "auto_schedule" && event.toolPayload) {
            setPreview(event.toolPayload as ReschedulePreview);
          }
          if (event.toolName && event.toolName !== "confirmation_required") {
            window.dispatchEvent(
              new CustomEvent("flowday:ai-action", {
                detail: { label: event.toolName.replace(/_/g, " ") },
              })
            );
          }
          if (conversationId && activeId === "pending")
            setActiveId(conversationId);
        } else {
          assistantText += event.value || "";
          const targetId = conversationId || activeId || "pending";
          setConversations((current) =>
            current.map((item) =>
              item.id === "pending" || item.id === targetId
                ? {
                    ...item,
                    id: targetId,
                    messages: item.messages.map((msg) =>
                      msg.id === tempAssistant.id
                        ? { ...msg, content: assistantText }
                        : msg
                    ),
                  }
                : item
            )
          );
        }
      }
    }
    if (requiresConfirm) setPendingConfirm(trimmed);
    setStreaming(false);
  }

  async function applyPreview() {
    if (!preview) return;
    const response = await fetch("/api/tasks/reschedule-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "apply", token: preview.previewToken }),
    });
    if (!response.ok) return;
    const data = (await response.json()) as { undoToken: string };
    setUndoToken(data.undoToken);
    setPreview(null);
    window.dispatchEvent(new CustomEvent("flowday:schedule-changed"));
  }

  async function undoPreview() {
    if (!undoToken) return;
    const response = await fetch("/api/tasks/reschedule-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "undo", token: undoToken }),
    });
    if (!response.ok) return;
    setUndoToken(null);
    window.dispatchEvent(new CustomEvent("flowday:schedule-changed"));
  }

  function runDailyBriefing() {
    localStorage.setItem(
      "lastBriefingAt",
      newDate().toISOString().slice(0, 10)
    );
    setShowBriefing(false);
    void send(
      "Plan my day. Review today's schedule, deadlines, workload, and focus capacity. Give me a concise prioritized briefing. Do not change anything without asking."
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-[#1A1D1E] text-white">
      {historyOpen && (
        <aside className="w-[260px] flex-none border-r border-[#323234] bg-[#1A1D1E] p-2">
          <div className="mb-2 flex items-center gap-2 rounded-md border border-[#323234] bg-[#262627] px-2.5 py-2 text-[13px] text-[#9AA0A6]">
            <Search className="h-4 w-4" strokeWidth={1.75} />
            Search chats...
          </div>
          <button
            type="button"
            onClick={newChat}
            className="mb-4 flex w-full items-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2 text-[13px] font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            New chat
          </button>
          {Object.entries(grouped).map(([day, items]) => (
            <div key={day} className="mb-3">
              <div className="px-2 text-[11px] uppercase text-[#9AA0A6]">
                {day}
              </div>
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveId(item.id)}
                  className={`mt-1 w-full truncate rounded-md px-2.5 py-2 text-left text-[13px] ${
                    item.id === activeId ? "bg-[#2B2F31]" : "hover:bg-[#262627]"
                  }`}
                >
                  {item.title}
                </button>
              ))}
            </div>
          ))}
        </aside>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-11 items-center border-b border-[#323234] px-3">
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            className="grid h-8 w-8 place-items-center rounded-md text-[#9AA0A6] hover:bg-[#2B2F31] hover:text-white"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
          <div className="ml-2 text-sm font-medium">AI Chat</div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {!messages.length ? (
            <div className="mx-auto flex h-full max-w-[760px] flex-col justify-center text-center">
              <h1 className="text-2xl font-medium">{APP_NAME} is ready.</h1>
              <p className="mt-2 text-sm text-[#9AA0A6]">
                What can I help you get done?
              </p>
              {showBriefing && canChat && (
                <button
                  type="button"
                  onClick={runDailyBriefing}
                  className="mx-auto mt-5 flex w-full max-w-md items-center gap-3 rounded-md border border-[var(--border-control)] bg-[var(--surface-raised)] px-4 py-3 text-left transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <CalendarCheck className="h-5 w-5 text-[var(--color-accent)]" />
                  <span>
                    <span className="block text-sm font-medium">
                      Plan my day
                    </span>
                    <span className="block text-xs text-[var(--text-secondary)]">
                      Deadlines, workload, schedule, and a clear first step.
                    </span>
                  </span>
                </button>
              )}
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {prompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="rounded-md border border-[#323234] bg-[#262627] px-4 py-3 text-left text-sm hover:bg-[#2B2F31]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-[760px] space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-md border border-[#323234] px-3 py-2 text-sm ${
                    message.role === "user"
                      ? "ml-auto max-w-[78%] bg-[#2B2F31]"
                      : "mr-auto max-w-[86%] bg-[#262627]"
                  }`}
                >
                  {message.content}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[#323234] p-3">
          {settings?.usage && !settings.hasApiKey && (
            <div className="mx-auto mb-2 max-w-[760px] text-right text-xs text-[var(--text-secondary)]">
              {settings.usage.remaining}/{settings.usage.limit} actions left
              this month
            </div>
          )}
          {!canChat && (
            <div className="mx-auto mb-2 max-w-[760px] rounded-md border border-[#323234] bg-[#262627] px-3 py-2 text-sm text-[#9AA0A6]">
              {settings?.usage && !settings.usage.allowed
                ? "Hosted AI limit reached. Add your own key for unlimited actions. "
                : "Hosted AI is not configured. "}
              <Link href="/settings" className="text-[#8EA2FF]">
                Open Settings → AI
              </Link>
            </div>
          )}
          {preview && (
            <div className="mx-auto mb-2 max-w-[760px] rounded-md border border-[var(--border-control)] bg-[var(--surface-raised)] p-3 text-sm">
              <div className="font-medium">Schedule preview</div>
              <div className="mt-2 max-h-36 space-y-1 overflow-y-auto text-xs text-[var(--text-secondary)]">
                {preview.changes.length ? (
                  preview.changes.map((change) => (
                    <div key={change.taskId}>
                      {change.title}:{" "}
                      {change.fromStart
                        ? newDate(change.fromStart).toLocaleString()
                        : "unscheduled"}{" "}
                      →{" "}
                      {change.toStart
                        ? newDate(change.toStart).toLocaleString()
                        : "unscheduled"}
                    </div>
                  ))
                ) : (
                  <div>No changes needed.</div>
                )}
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="rounded-md border border-[var(--border-control)] px-3 py-1.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyPreview}
                  disabled={!preview.changes.length}
                  className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs text-white disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
          {undoToken && (
            <div className="mx-auto mb-2 flex max-w-[760px] items-center justify-between rounded-md border border-[var(--border-control)] bg-[var(--surface-raised)] px-3 py-2 text-sm">
              <span>Schedule updated.</span>
              <button
                type="button"
                onClick={undoPreview}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--color-accent)]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Undo
              </button>
            </div>
          )}
          {pendingConfirm && (
            <div className="mx-auto mb-2 flex max-w-[760px] items-center justify-between rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
              <span>Confirm this planner-changing action?</span>
              <button
                type="button"
                onClick={() => send(pendingConfirm, true)}
                className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs text-white"
              >
                Confirm
              </button>
            </div>
          )}
          <form
            className="mx-auto flex max-w-[760px] items-center gap-2 rounded-md border border-[#323234] bg-[#262627] p-2"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <input
              disabled={!canChat || streaming}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-[#9AA0A6]"
              placeholder="Ask anything about your tasks and calendar..."
            />
            <button
              type="submit"
              disabled={!canChat || streaming || !input.trim()}
              className="grid h-8 w-8 place-items-center rounded-md bg-[var(--accent)] text-white disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
