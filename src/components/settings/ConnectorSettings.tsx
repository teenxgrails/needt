"use client";

import { useEffect, useState } from "react";

import { Copy, KeyRound, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { SettingRow, SettingsSection } from "./SettingsSection";

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
      <SettingsSection
        title="Integrations"
        description="Loading local connector settings."
      >
        <div className="text-sm text-muted-foreground">Loading...</div>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      title="Integrations"
      description="Let local scripts and automations create tasks, read the schedule, and trigger rescheduling."
    >
      <SettingRow
        label="Personal Token"
        description="A single bearer token for local tools. The full token is shown once."
      >
        <div className="space-y-3">
          <div className="rounded-md border p-3 text-sm">
            {settings.hasToken
              ? `Active token: ${settings.tokenPreview}`
              : "No connector token yet."}
          </div>
          {newToken && (
            <div className="space-y-2 rounded-md border border-primary/40 bg-primary/10 p-3">
              <Label>Copy this token now</Label>
              <div className="flex gap-2">
                <Input
                  value={newToken}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => navigator.clipboard.writeText(newToken)}
                  aria-label="Copy connector token"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          <Button type="button" variant="outline" onClick={generateToken}>
            <KeyRound className="mr-2 h-4 w-4" />
            {settings.hasToken ? "Rotate Token" : "Generate Token"}
          </Button>
        </div>
      </SettingRow>

      <SettingRow
        label="Outbound Webhook"
        description="Optional local webhook for schedule changes or task completion."
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
              placeholder="http://localhost:5678/webhook/flowday"
            />
          </div>
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">Schedule changes</span>
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
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">Task completion</span>
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

      <div className="flex justify-end">
        <Button type="button" onClick={saveSettings} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Connector Settings"}
        </Button>
      </div>
    </SettingsSection>
  );
}
