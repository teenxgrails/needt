"use client";

import { useEffect, useState } from "react";

import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  KeyRound,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { APP_NAME } from "@/lib/app-config";

import { SettingRow, SettingsCard, SettingsSection } from "./SettingsSection";

type AIProvider = "NONE" | "ANTHROPIC" | "OPENAI" | "GROK" | "GLM" | "CUSTOM";
type SoulPreset = "business" | "coach";

interface AISettingsResponse {
  provider: AIProvider;
  hasApiKey: boolean;
  providerKeys?: Partial<Record<Exclude<AIProvider, "NONE">, boolean>>;
  customUrl: string | null;
  model: string | null;
  soulPreset: SoulPreset;
  allowParseTasks: boolean;
  allowReorder: boolean;
  allowSuggestEnergy: boolean;
  allowFullAuto: boolean;
  requestTimeoutSeconds: number;
  hostedAvailable?: boolean;
  usage?: {
    used: number;
    limit: number;
    remaining: number;
    allowed: boolean;
  };
  oauth: {
    available: boolean;
    connected: boolean;
    expiresAt: string | null;
  };
}

interface ParsedTaskPreview {
  title: string;
  estimatedMinutes?: number;
  priority?: string;
  energyRequired?: string;
  contextTag?: string;
}

interface AgentMemory {
  id: string;
  kind: "preference" | "pattern" | "goal" | "fact";
  content: string;
  source: "chat" | "inferred";
  weight: number;
}

const DEFAULT_SETTINGS: AISettingsResponse = {
  provider: "NONE",
  hasApiKey: false,
  customUrl: null,
  model: null,
  soulPreset: "business",
  allowParseTasks: true,
  allowReorder: false,
  allowSuggestEnergy: true,
  allowFullAuto: false,
  requestTimeoutSeconds: 20,
  oauth: {
    available: false,
    connected: false,
    expiresAt: null,
  },
};

const providerDefaults: Record<Exclude<AIProvider, "NONE">, string> = {
  ANTHROPIC: "claude-sonnet-4-6",
  OPENAI: "gpt-4o",
  GROK: "grok-2-latest",
  GLM: "glm-4.5",
  CUSTOM: "optional",
};

const providerLabels: Record<AIProvider, string> = {
  NONE: "None",
  ANTHROPIC: "Anthropic",
  OPENAI: "OpenAI",
  GROK: "Grok",
  GLM: "GLM",
  CUSTOM: "Custom AI",
};

const providerKeyLinks: Partial<
  Record<Exclude<AIProvider, "NONE" | "CUSTOM">, string>
> = {
  OPENAI: "https://platform.openai.com/api-keys",
  ANTHROPIC: "https://console.anthropic.com/settings/keys",
};

function getProviderKeyLink(provider: AIProvider) {
  if (provider === "OPENAI" || provider === "ANTHROPIC") {
    return providerKeyLinks[provider];
  }
  return undefined;
}

export function AIAssistantSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [apiKey, setApiKey] = useState("");
  const [brainDump, setBrainDump] = useState("");
  const [parsedTasks, setParsedTasks] = useState<ParsedTaskPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isDisconnectingOAuth, setIsDisconnectingOAuth] = useState(false);
  const [isConnectingOAuth, setIsConnectingOAuth] = useState(false);
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [isClearingMemories, setIsClearingMemories] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [settingsResponse, memoriesResponse] = await Promise.all([
          fetch("/api/ai-settings"),
          fetch("/api/ai/memories"),
        ]);
        if (!settingsResponse.ok) throw new Error("Failed to load AI settings");
        const data = (await settingsResponse.json()) as AISettingsResponse;
        const memoryData = memoriesResponse.ok
          ? ((await memoriesResponse.json()) as { memories: AgentMemory[] })
          : { memories: [] };
        if (!cancelled) {
          setSettings(data);
          setMemories(memoryData.memories);
        }
      } catch (error) {
        toast.error("Could not load AI settings", {
          description:
            error instanceof Error ? error.message : "Please try again later.",
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("ai-oauth");
    if (result === "connected") {
      toast.success("Custom AI OAuth connected");
    } else if (result === "failed") {
      toast.error("Could not connect Custom AI OAuth");
    } else {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("ai-oauth");
    window.history.replaceState({}, "", url);
  }, []);

  const updateSetting = <Key extends keyof AISettingsResponse>(
    key: Key,
    value: AISettingsResponse[Key]
  ) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const persistSettings = async () => {
    const response = await fetch("/api/ai-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, apiKey }),
    });
    if (!response.ok) throw new Error("Failed to save AI settings");
    const data = (await response.json()) as AISettingsResponse;
    setSettings(data);
    setApiKey("");
    return data;
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      await persistSettings();
      toast.success("AI assistant settings saved");
    } catch (error) {
      toast.error("Could not save AI settings", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const parseBrainDump = async () => {
    try {
      setIsParsing(true);
      const response = await fetch("/api/ai/parse-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: brainDump }),
      });
      if (!response.ok) throw new Error("Failed to parse tasks");
      const data = (await response.json()) as { tasks: ParsedTaskPreview[] };
      setParsedTasks(data.tasks);
    } catch (error) {
      toast.error("Could not parse the brain dump", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsParsing(false);
    }
  };

  const disconnectOAuth = async () => {
    try {
      setIsDisconnectingOAuth(true);
      const response = await fetch("/api/ai/oauth/custom", {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to disconnect OAuth");

      setSettings((current) => ({
        ...current,
        oauth: { ...current.oauth, connected: false, expiresAt: null },
      }));
      toast.success("Custom AI OAuth disconnected");
    } catch (error) {
      toast.error("Could not disconnect Custom AI OAuth", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsDisconnectingOAuth(false);
    }
  };

  const connectCustomOAuth = async () => {
    if (!settings.customUrl?.trim()) {
      toast.error("Add your Custom AI endpoint before connecting");
      return;
    }

    try {
      setIsConnectingOAuth(true);
      await persistSettings();
      window.location.assign("/api/ai/oauth/custom/authorize");
    } catch (error) {
      toast.error("Could not start Custom AI connection", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
      setIsConnectingOAuth(false);
    }
  };

  const deleteMemory = async (memoryId: string) => {
    const response = await fetch("/api/ai/memories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memoryId }),
    });
    if (!response.ok) {
      toast.error("Could not delete memory");
      return;
    }
    setMemories((current) =>
      current.filter((memory) => memory.id !== memoryId)
    );
  };

  const clearMemories = async () => {
    setIsClearingMemories(true);
    try {
      const response = await fetch("/api/ai/memories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!response.ok) throw new Error("Failed to clear memories");
      setMemories([]);
      toast.success("AI memory cleared");
    } catch (error) {
      toast.error("Could not clear AI memory", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsClearingMemories(false);
    }
  };

  if (isLoading) {
    return (
      <div
        className="max-w-[896px] space-y-5"
        aria-label="Loading AI assistant settings"
      >
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-[480px] max-w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }

  const providerKeyLink = getProviderKeyLink(settings.provider);
  const hasSavedProviderKey =
    settings.provider !== "NONE" &&
    Boolean(settings.providerKeys?.[settings.provider] || settings.hasApiKey);

  return (
    <SettingsSection
      title="Provider"
      description="Hosted planning help is ready by default. Deterministic scheduling always remains the source of truth."
    >
      <SettingRow
        label="Assistant"
        description={`Use hosted AI within the monthly allowance, or bring your own key for unlimited actions. Keys are encrypted before storage.`}
      >
        <div className="space-y-4">
          <Select
            value={settings.provider}
            onValueChange={(value) =>
              updateSetting("provider", value as AIProvider)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">Needt hosted</SelectItem>
              <SelectItem value="ANTHROPIC">Anthropic</SelectItem>
              <SelectItem value="OPENAI">OpenAI</SelectItem>
              <SelectItem value="GROK">Grok (xAI)</SelectItem>
              <SelectItem value="GLM">GLM (z.ai)</SelectItem>
              <SelectItem value="CUSTOM">Custom</SelectItem>
            </SelectContent>
          </Select>
          <div
            className="grid gap-2 sm:grid-cols-2"
            role="radiogroup"
            aria-label="Assistant personality"
          >
            <button
              type="button"
              role="radio"
              aria-checked={settings.soulPreset === "business"}
              onClick={() => updateSetting("soulPreset", "business")}
              className={`rounded-[var(--control-radius)] border px-3 py-2 text-left text-[13px] transition-colors ${
                settings.soulPreset === "business"
                  ? "border-[var(--color-accent)] bg-[var(--surface-hover)]"
                  : "border-[var(--border-control)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              Brief business assistant
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={settings.soulPreset === "coach"}
              onClick={() => updateSetting("soulPreset", "coach")}
              className={`rounded-[var(--control-radius)] border px-3 py-2 text-left text-[13px] transition-colors ${
                settings.soulPreset === "coach"
                  ? "border-[var(--color-accent)] bg-[var(--surface-hover)]"
                  : "border-[var(--border-control)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              Friendly ADHD coach
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ai-model">Model</Label>
              <Input
                id="ai-model"
                value={settings.model || ""}
                onChange={(event) => updateSetting("model", event.target.value)}
                placeholder={
                  settings.provider === "NONE"
                    ? "hosted default"
                    : providerDefaults[settings.provider]
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-timeout">Timeout seconds</Label>
              <Input
                id="ai-timeout"
                type="number"
                min={5}
                max={60}
                value={settings.requestTimeoutSeconds}
                onChange={(event) =>
                  updateSetting(
                    "requestTimeoutSeconds",
                    Number(event.target.value)
                  )
                }
              />
            </div>
          </div>
          {settings.provider === "CUSTOM" && (
            <div className="space-y-2">
              <Label htmlFor="custom-url">Custom AI endpoint</Label>
              <Input
                id="custom-url"
                value={settings.customUrl || ""}
                onChange={(event) =>
                  updateSetting("customUrl", event.target.value)
                }
                placeholder="https://ai.example.com"
              />
              <p className="text-xs text-[var(--text-secondary)]">
                This is usually prefilled by your planner administrator.
              </p>
            </div>
          )}
          {settings.provider === "CUSTOM" && (
            <SettingsCard className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Connect Custom AI</div>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    Sign in once. Your encrypted connection refreshes itself.
                  </p>
                </div>
                {settings.oauth.connected && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-success)]" />
                )}
              </div>
              <div className="mt-3">
                {settings.oauth.available ? (
                  settings.oauth.connected ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-[var(--text-secondary)]">
                        Connected
                        {settings.oauth.expiresAt
                          ? ` · refreshes after ${new Date(
                              settings.oauth.expiresAt
                            ).toLocaleString()}`
                          : ""}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={disconnectOAuth}
                        disabled={isDisconnectingOAuth}
                      >
                        {isDisconnectingOAuth
                          ? "Disconnecting..."
                          : "Disconnect"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={connectCustomOAuth}
                      disabled={
                        isConnectingOAuth || !settings.customUrl?.trim()
                      }
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      {isConnectingOAuth ? "Connecting..." : "Connect"}
                    </Button>
                  )
                ) : (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Ask your planner administrator to enable Custom AI OAuth.
                  </p>
                )}
              </div>
            </SettingsCard>
          )}
          {settings.usage && settings.provider === "NONE" && (
            <SettingsCard className="p-3">
              <div className="text-sm font-medium">
                {settings.usage.remaining}/{settings.usage.limit} actions left
                this month
              </div>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Hosted actions reset monthly. Bring your own provider key below
                for unlimited usage.
              </p>
            </SettingsCard>
          )}
          {settings.provider !== "NONE" && (
            <div className="space-y-2">
              <Label htmlFor="ai-key">
                Your API key {hasSavedProviderKey ? "(saved)" : ""}
              </Label>
              <Input
                id="ai-key"
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={
                  settings.hasApiKey ? "Leave blank to keep saved key" : ""
                }
              />
              {settings.provider === "CUSTOM" ? (
                <p className="text-xs text-[var(--text-secondary)]">
                  Optional fallback if your Custom AI service also supports API
                  keys.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-[var(--text-secondary)]">
                  <span>Advanced · bypasses the hosted monthly limit.</span>
                  {providerKeyLink && (
                    <a
                      href={providerKeyLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[var(--color-accent)] hover:opacity-80"
                    >
                      Get an API key
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </SettingRow>

      <SettingRow
        label="AI Memory"
        description="Durable non-sensitive preferences and goals the assistant can reuse. Credentials, health, financial data, and email bodies are never stored here."
      >
        <div className="space-y-3">
          <SettingsCard className="divide-y divide-[var(--border-subtle)]">
            {memories.length ? (
              memories.map((memory) => (
                <div
                  key={memory.id}
                  className="flex items-start gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
                      {memory.kind}
                    </div>
                    <div className="mt-0.5 text-[13px]">{memory.content}</div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete memory: ${memory.content}`}
                    onClick={() => deleteMemory(memory.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-[var(--text-secondary)]">
                No saved memories yet.
              </div>
            )}
          </SettingsCard>
          {memories.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={clearMemories}
              disabled={isClearingMemories}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isClearingMemories ? "Clearing..." : "Clear all memory"}
            </Button>
          )}
        </div>
      </SettingRow>

      <SettingRow
        label="Permissions"
        description={`AI suggestions are shown as suggestions; ${APP_NAME} does not silently reshuffle.`}
      >
        <SettingsCard className="divide-y divide-[var(--border-subtle)]">
          {[
            ["allowParseTasks", "Parse brain dumps"],
            ["allowReorder", "Suggest reorder"],
            ["allowSuggestEnergy", "Suggest energy tags"],
            ["allowFullAuto", "Full auto suggestions"],
          ].map(([key, label]) => (
            <label
              key={key}
              className="flex min-h-11 items-center justify-between gap-4 px-3"
            >
              <span className="text-[13px]">{label}</span>
              <Switch
                checked={Boolean(settings[key as keyof AISettingsResponse])}
                onCheckedChange={(checked) =>
                  updateSetting(
                    key as keyof AISettingsResponse,
                    checked as never
                  )
                }
              />
            </label>
          ))}
        </SettingsCard>
      </SettingRow>

      <SettingRow
        label="Parser preview"
        description={`Test how messy notes become tasks. If AI is unavailable, ${APP_NAME} uses its local parser.`}
      >
        <div className="space-y-3">
          <Textarea
            value={brainDump}
            onChange={(event) => setBrainDump(event.target.value)}
            placeholder="Ship proposal 45m&#10;Call dentist today&#10;Deep work on launch plan 2h"
            className="min-h-28"
          />
          <Button
            type="button"
            variant="outline"
            onClick={parseBrainDump}
            disabled={!brainDump.trim() || isParsing}
          >
            <ClipboardList className="mr-2 h-4 w-4" />
            {isParsing ? "Parsing..." : "Preview Tasks"}
          </Button>
          {parsedTasks.length > 0 && (
            <SettingsCard className="space-y-2 p-3">
              {parsedTasks.map((task, index) => (
                <div key={`${task.title}-${index}`} className="text-sm">
                  <div className="font-medium">{task.title}</div>
                  <div className="text-[var(--text-secondary)]">
                    {[
                      task.estimatedMinutes && `${task.estimatedMinutes}m`,
                      task.priority,
                      task.energyRequired,
                      task.contextTag,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
              ))}
            </SettingsCard>
          )}
        </div>
      </SettingRow>

      <div className="flex justify-end">
        <Button type="button" onClick={saveSettings} disabled={isSaving}>
          {settings.provider === "NONE" ? (
            <Bot className="mr-2 h-4 w-4" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isSaving
            ? "Saving..."
            : settings.provider === "NONE"
              ? "Save AI Assistant"
              : settings.provider === "CUSTOM"
                ? "Save Custom AI settings"
                : hasSavedProviderKey
                  ? "Save changes"
                  : `Connect ${providerLabels[settings.provider]}`}
        </Button>
      </div>
    </SettingsSection>
  );
}
