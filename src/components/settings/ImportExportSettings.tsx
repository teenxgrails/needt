"use client";

import { useState } from "react";
import { useRef } from "react";

import { Download, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { APP_SLUG } from "@/lib/app-config";

import { SettingRow, SettingsSection } from "./SettingsSection";

export function ImportExportSettings() {
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(
        `/api/export/tasks?includeCompleted=${includeCompleted}`
      );

      if (!response.ok) {
        throw new Error("Failed to export tasks");
      }

      const data = await response.json();

      // Create a blob from the JSON data
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });

      // Create a download link and trigger the download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${APP_SLUG}-tasks-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Tasks exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export tasks");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      // Read the file
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content);

          // Send the data to the import API
          const response = await fetch("/api/import/tasks", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Import failed");
          }

          const result = await response.json();
          toast.success(`Import successful: ${result.imported} tasks imported`);
        } catch (error) {
          console.error("Import processing error:", error);
          toast.error(
            `Import failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        } finally {
          setIsImporting(false);
          // Reset the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      };

      reader.onerror = () => {
        toast.error("Failed to read the file");
        setIsImporting(false);
      };

      reader.readAsText(file);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import tasks");
      setIsImporting(false);
    }
  };

  return (
    <SettingsSection
      title="Import & export"
      description="Move tasks into or out of your planner without changing your calendar connections."
    >
      <SettingRow
        label="Task archive"
        description="Choose whether completed tasks are included in the exported JSON file."
      >
        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeCompleted"
            checked={includeCompleted}
            onCheckedChange={(checked) =>
              setIncludeCompleted(checked as boolean)
            }
          />
          <Label htmlFor="includeCompleted">Include completed tasks</Label>
        </div>
      </SettingRow>

      <SettingRow
        label="Tasks"
        description="Export a task archive or import a previously exported JSON file."
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export Tasks
          </Button>

          <Button
            onClick={handleImportClick}
            disabled={isImporting}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Import Tasks
          </Button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
        </div>
      </SettingRow>

      <SettingRow
        label="File format"
        description="Exports include tasks, projects, and tags. Imports add the valid items from the selected file."
      >
        <div className="space-y-2 text-sm text-[#9BA1A6]">
          <p>
            <strong>Export:</strong> Creates a JSON file containing all your
            tasks, projects, and tags.
          </p>
          <p>
            <strong>Import:</strong> Imports tasks, projects, and tags from a
            JSON file. Tasks will be associated with your account.
          </p>
          <p className="text-yellow-600 dark:text-yellow-400">
            Note: Importing will not delete or modify your existing tasks, but
            may create duplicates if tasks with similar titles exist.
          </p>
        </div>
      </SettingRow>
    </SettingsSection>
  );
}
