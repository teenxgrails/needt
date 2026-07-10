"use client";

import { useEffect, useState } from "react";

import { Bot, ClipboardList, KeyRound, Save } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { SettingRow, SettingsSection } from "./SettingsSection";

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
}

interface ParsedTaskPreview {
  title: string;
  estimatedMinutes?: number;
  priority?: string;
  energyRequired?: string;
  contextTag?: string;
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
};

const providerDefaults: Record<Exclude<AIProvider, "NONE">, string> = {
  ANTHROPIC: "claude-sonnet-4-6",
  OPENAI: "gpt-4o",
  GROK: "grok-2-latest",
  GLM: "glm-4.5",
  CUSTOM: "optional",
};

export function AIAssistantSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [apiKey, setApiKey] = useState("");
  const [brainDump, setBrainDump] = useState("");
  const [parsedTasks, setParsedTasks] = useState<ParsedTaskPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/ai-settings");
        if (!response.ok) throw new Error("Failed to load AI settings");
        const data = (await response.json()) as AISettingsResponse;
        if (!cancelled) setSettings(data);
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

  const updateSetting = <Key extends keyof AISettingsResponse>(
    key: Key,
    value: AISettingsResponse[Key]
  ) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      const response = await fetch("/api/ai-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, apiKey }),
      });
      if (!response.ok) throw new Error("Failed to save AI settings");
      const data = (await response.json()) as AISettingsResponse;
      setSettings(data);
      setApiKey("");
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

  if (isLoading) {
    return (
      <SettingsSection
        title="AI Assistant"
        description="Loading AI provider settings."
      >
        <div className="text-sm text-muted-foreground">Loading...</div>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      title="AI Assistant"
      description="Optional scheduling help. Deterministic scheduling stays the default and fallback."
    >
      <SettingRow
        label="Provider"
        description="None keeps Flowday fully offline. API keys are encrypted before storage."
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
              <SelectItem value="NONE">None</SelectItem>
              <SelectItem value="ANTHROPIC">Anthropic</SelectItem>
              <SelectItem value="OPENAI">OpenAI</SelectItem>
              <SelectItem value="GROK">Grok (xAI)</SelectItem>
              <SelectItem value="GLM">GLM (z.ai)</SelectItem>
              <SelectItem value="CUSTOM">Custom</SelectItem>
            </SelectContent>
          </Select>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => updateSetting("soulPreset", "business")}
              className={`rounded-md border px-3 py-2 text-left text-sm ${
                settings.soulPreset === "business"
                  ? "border-[#3E63DD] bg-[#2B2F31]"
                  : "border-[#323234] bg-[#262627]"
              }`}
            >
              Brief business assistant
            </button>
            <button
              type="button"
              onClick={() => updateSetting("soulPreset", "coach")}
              className={`rounded-md border px-3 py-2 text-left text-sm ${
                settings.soulPreset === "coach"
                  ? "border-[#3E63DD] bg-[#2B2F31]"
                  : "border-[#323234] bg-[#262627]"
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
                    ? "deterministic only"
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
          {settings.provider !== "NONE" && (
            <div className="space-y-2">
              <Label htmlFor="ai-key">
                API key{" "}
                {settings.providerKeys?.[settings.provider] ||
                settings.hasApiKey
                  ? "(saved)"
                  : ""}
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
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-2 rounded-md border border-[#323234] bg-[#262627] px-3 py-1.5 text-xs text-muted-foreground"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Connect OAuth (soon)
              </button>
            </div>
          )}
          {settings.provider === "CUSTOM" && (
            <div className="space-y-2">
              <Label htmlFor="custom-url">Custom endpoint</Label>
              <Input
                id="custom-url"
                value={settings.customUrl || ""}
                onChange={(event) =>
                  updateSetting("customUrl", event.target.value)
                }
                placeholder="http://localhost:8787"
              />
            </div>
          )}
        </div>
      </SettingRow>

      <SettingRow
        label="Allowed Actions"
        description="AI suggestions are shown as suggestions; Flowday does not silently reshuffle."
      >
        <div className="space-y-3">
          {[
            ["allowParseTasks", "Parse brain dumps"],
            ["allowReorder", "Suggest reorder"],
            ["allowSuggestEnergy", "Suggest energy tags"],
            ["allowFullAuto", "Full auto suggestions"],
          ].map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-sm">{label}</span>
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
        </div>
      </SettingRow>

      <SettingRow
        label="Brain Dump"
        description="Paste messy notes and preview structured tasks. With provider None, Flowday uses a local parser."
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
            <div className="space-y-2 rounded-md border p-3">
              {parsedTasks.map((task, index) => (
                <div key={`${task.title}-${index}`} className="text-sm">
                  <div className="font-medium">{task.title}</div>
                  <div className="text-muted-foreground">
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
            </div>
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
          {isSaving ? "Saving..." : "Save AI Assistant"}
        </Button>
      </div>
    </SettingsSection>
  );
}
