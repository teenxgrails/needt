"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { PanelLeftClose, Plus, Send, Search } from "lucide-react";

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
  const [historyOpen, setHistoryOpen] = useState(!compact);

  const active = conversations.find((item) => item.id === activeId) || null;
  const messages = active?.messages || [];
  const canChat = settings?.provider !== "NONE" && settings?.hasApiKey;

  useEffect(() => {
    fetch("/api/ai-settings")
      .then((response) => response.json())
      .then(setSettings)
      .catch(() => setSettings({ provider: "NONE", hasApiKey: false }));
    fetch("/api/ai/conversations")
      .then((response) => response.json())
      .then((data) => {
        setConversations(data.conversations || []);
        setActiveId(data.conversations?.[0]?.id || null);
      })
      .catch(() => undefined);
  }, []);

  const grouped = useMemo(() => {
    return conversations.reduce<Record<string, AiConversation[]>>((acc, item) => {
      const day = new Date(item.createdAt).toLocaleDateString();
      acc[day] = acc[day] || [];
      acc[day].push(item);
      return acc;
    }, {});
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
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    const tempAssistant: AiMessage = {
      id: `assistant-${Date.now()}`,
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
            createdAt: new Date().toISOString(),
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
        };
        if (event.type === "meta") {
          conversationId = event.conversationId || conversationId;
          requiresConfirm = Boolean(event.requiresConfirm);
          if (event.toolName && event.toolName !== "confirmation_required") {
            window.dispatchEvent(
              new CustomEvent("mina:ai-action", {
                detail: { label: event.toolName.replace(/_/g, " ") },
              })
            );
          }
          if (conversationId && activeId === "pending") setActiveId(conversationId);
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
            className="mb-4 flex w-full items-center gap-2 rounded-md bg-[#3E63DD] px-3 py-2 text-[13px] font-medium text-white"
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
              <h1 className="text-2xl font-medium">Hi Maksym!</h1>
              <p className="mt-2 text-sm text-[#9AA0A6]">
                What can I help you get done?
              </p>
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
          {!canChat && (
            <div className="mx-auto mb-2 max-w-[760px] rounded-md border border-[#323234] bg-[#262627] px-3 py-2 text-sm text-[#9AA0A6]">
              Add an AI provider key to use chat.{" "}
              <Link href="/settings" className="text-[#8EA2FF]">
                Open Settings → AI
              </Link>
            </div>
          )}
          {pendingConfirm && (
            <div className="mx-auto mb-2 flex max-w-[760px] items-center justify-between rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
              <span>Confirm this planner-changing action?</span>
              <button
                type="button"
                onClick={() => send(pendingConfirm, true)}
                className="rounded-md bg-[#3E63DD] px-3 py-1.5 text-xs text-white"
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
              className="grid h-8 w-8 place-items-center rounded-md bg-[#3E63DD] text-white disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
