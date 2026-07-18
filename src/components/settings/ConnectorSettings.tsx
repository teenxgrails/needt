"use client";

import { useEffect, useState } from "react";

import { Copy, KeyRound, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

import {
  SettingRow,
  SettingsAdvanced,
  SettingsCard,
  SettingsSection,
} from "./SettingsSection";

interface ConnectorSettingsResponse {
  hasToken: boolean;
  tokenPreview: string | null;
  token?: string;
  webhookUrl: string | null;
  webhookSchedule: boolean;
  webhookTaskComplete: boolean;
}

const DEFAULT_SETTINGS: ConnectorSettingsResponse = {
  hasToken: false,
  tokenPreview: null,
  webhookUrl: null,
  webhookSchedule: false,
  webhookTaskComplete: false,
};

export function ConnectorSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/connector-settings");
        if (!response.ok) throw new Error("Failed to load connector settings");
        const data = (await response.json()) as ConnectorSettingsResponse;
        if (!cancelled) setSettings(data);
      } catch (error) {
        toast.error("Could not load connector settings", {
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

  const generateToken = async () => {
    const response = await fetch("/api/connector-settings", { method: "POST" });
    if (!response.ok) {
      toast.error("Could not generate connector token");
      return;
    }
    const data = (await response.json()) as ConnectorSettingsResponse;
    setSettings(data);
    setNewToken(data.token || null);
    toast.success("Connector token generated");
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      const response = await fetch("/api/connector-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error("Failed to save connector settings");
      const data = (await response.json()) as ConnectorSettingsResponse;
      setSettings(data);
      toast.success("Connector settings saved");
    } catch (error) {
      toast.error("Could not save connector settings", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div
        className="max-w-[896px] space-y-5"
        aria-label="Loading API settings"
      >
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-[420px] max-w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  return (
    <SettingsSection
      title="Personal API"
      description="Connect your own trusted automations to Needt."
    >
      <SettingRow
        label="Access token"
        description="Used by scripts and automations. A new token is shown only once."
      >
        <div className="space-y-3">
          <SettingsCard className="flex min-h-[54px] items-center justify-between gap-3 px-4">
            <div>
              <div className="text-[14px] font-medium">
                {settings.hasToken ? "Active token" : "No active token"}
              </div>
              <div className="mt-0.5 font-mono text-[12px] text-[var(--text-secondary)]">
                {settings.tokenPreview || "Generate one when you are ready"}
              </div>
            </div>
            <span
              className={`h-2 w-2 rounded-full ${
                settings.hasToken
                  ? "bg-[var(--color-success)]"
                  : "bg-[var(--text-muted)]"
              }`}
              aria-hidden="true"
            />
          </SettingsCard>
          {newToken && (
            <div className="space-y-2 rounded-[var(--control-radius)] border border-[var(--border-control)] bg-[var(--surface-panel)] p-3">
              <Label htmlFor="new-connector-token">
                Copy this token now — it will not be shown again
              </Label>
              <div className="flex gap-2">
                <Input
                  id="new-connector-token"
                  value={newToken}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(newToken);
                      toast.success("Token copied");
                    } catch {
                      toast.error("Could not copy token");
                    }
                  }}
                  aria-label="Copy connector token"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          <Button type="button" variant="outline" onClick={generateToken}>
            <KeyRound className="mr-2 h-4 w-4" />
            {settings.hasToken ? "Rotate token" : "Generate token"}
          </Button>
        </div>
      </SettingRow>

      <SettingsAdvanced
        title="Webhooks"
        description="Send schedule and completion events to an automation URL."
      >
        <SettingRow
          label="Destination"
          description="Needt sends a POST request when an enabled event occurs."
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="connector-webhook">Webhook URL</Label>
              <Input
                id="connector-webhook"
                value={settings.webhookUrl || ""}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    webhookUrl: event.target.value,
                  }))
                }
                placeholder="http://localhost:5678/webhook/needt"
              />
            </div>
            <label className="flex min-h-8 items-center justify-between gap-4 text-[14px]">
              <span>Schedule changes</span>
              <Switch
                checked={settings.webhookSchedule}
                onCheckedChange={(checked) =>
                  setSettings((current) => ({
                    ...current,
                    webhookSchedule: checked,
                  }))
                }
              />
            </label>
            <label className="flex min-h-8 items-center justify-between gap-4 text-[14px]">
              <span>Task completion</span>
              <Switch
                checked={settings.webhookTaskComplete}
                onCheckedChange={(checked) =>
                  setSettings((current) => ({
                    ...current,
                    webhookTaskComplete: checked,
                  }))
                }
              />
            </label>
          </div>
        </SettingRow>
      </SettingsAdvanced>

      <div className="mt-5 flex justify-end">
        <Button type="button" onClick={saveSettings} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving…" : "Save API settings"}
        </Button>
      </div>
    </SettingsSection>
  );
}
