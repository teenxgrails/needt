import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { logger } from "@/lib/logger";
import { LogSettings as LogSettingsType } from "@/lib/logger/types";

import { SettingRow, SettingsSection } from "../SettingsSection";

const LOG_SOURCE = "LogSettings";

export function LogSettings() {
  const [settings, setSettings] = useState<LogSettingsType>({
    logLevel: "none",
    logDestination: "db",
    logRetention: {
      error: 30,
      warn: 14,
      info: 7,
      debug: 3,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  logger.info("LogSettings component mounted", undefined, LOG_SOURCE);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/logs/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();
      setSettings(data);
      logger.debug(
        "Log settings fetched successfully",
        {
          settings: JSON.stringify(data),
        },
        LOG_SOURCE
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch settings";
      logger.error(
        "Failed to fetch log settings",
        {
          error: errorMessage,
        },
        LOG_SOURCE
      );
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSaved(false);

      const response = await fetch("/api/logs/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error("Failed to update settings");

      logger.info(
        "Log settings updated successfully",
        {
          settings: JSON.stringify(settings),
        },
        LOG_SOURCE
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000); // Clear saved message after 3 seconds
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update settings";
      logger.error(
        "Failed to update log settings",
        {
          error: errorMessage,
          settings: JSON.stringify(settings),
        },
        LOG_SOURCE
      );
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-32 items-center justify-center border-t border-[var(--border-subtle)] pt-5">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <SettingsSection
      title="Log configuration"
      description="Set the detail level, storage destination, and retention period for application logs."
    >
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {saved && (
        <Alert>
          <AlertDescription>Settings saved successfully!</AlertDescription>
        </Alert>
      )}

      <SettingRow
        label="Collection"
        description="Choose which details are kept and where they are stored."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="logLevel">Log Level</Label>
            <Select
              value={settings.logLevel}
              onValueChange={(value) =>
                setSettings({
                  ...settings,
                  logLevel: value as LogSettingsType["logLevel"],
                })
              }
            >
              <SelectTrigger id="logLevel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logDestination">Log Destination</Label>
            <Select
              value={settings.logDestination}
              onValueChange={(value) =>
                setSettings({
                  ...settings,
                  logDestination: value as LogSettingsType["logDestination"],
                })
              }
            >
              <SelectTrigger id="logDestination">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="db">Database Only</SelectItem>
                <SelectItem value="file">File Only</SelectItem>
                <SelectItem value="both">Both Database and File</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SettingRow>

      <SettingRow
        label="Retention periods"
        description="Number of days to retain each log level."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(settings.logRetention).map(([level, days]) => (
            <div key={level} className="space-y-2">
              <Label htmlFor={`retention-${level}`} className="capitalize">
                {level}
              </Label>
              <Input
                type="number"
                id={`retention-${level}`}
                value={days}
                min={1}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    logRetention: {
                      ...settings.logRetention,
                      [level]: parseInt(e.target.value) || 1,
                    },
                  })
                }
              />
            </div>
          ))}
        </div>
      </SettingRow>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </SettingsSection>
  );
}
