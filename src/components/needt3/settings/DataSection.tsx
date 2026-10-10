"use client";

import { useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { FiDownload } from "react-icons/fi";

import { sendJson } from "@/lib/needt3/hooks/core";
import { useSetPref, useSettings } from "@/lib/needt3/hooks/settings";
import { notify } from "@/lib/notifications";
import { clearNeedtOfflineData } from "@/lib/pwa/offline-client";

import { useMark } from "./SettingsContext";
import { readPref } from "./derive";
import { SBtn, SGroup, SRow, V3Switch } from "./kit";

/**
 * Data & privacy. Export tasks and the full export use the routes the old
 * Settings uses; the rest of the prototype's rows have nothing behind them.
 * //todo: Tasks as CSV (the route sends JSON), Documents as Markdown, the
 * Import menu (Markdown, Notion, Google Docs, .ics, CSV: import.jsx).
 */
export function DataSection() {
  const mark = useMark();
  const qc = useQueryClient();
  const settings = useSettings();
  const setPref = useSetPref();
  const [busy, setBusy] = useState<"all" | "device" | null>(null);

  const requestAll = async () => {
    setBusy("all");
    try {
      await sendJson("/api/account/export", "POST");
      notify.success("Export requested. We will email you a download link.");
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Could not start the export."
      );
    } finally {
      setBusy(null);
    }
  };
  const again = async () => {
    setBusy("device");
    try {
      await clearNeedtOfflineData();
      await qc.invalidateQueries({ queryKey: ["v3"] });
      notify.success("Fetched everything again");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <SGroup
        title="Export"
        hint="Everything you have in Needt is yours to take with you."
      >
        <SRow
          title="Tasks"
          desc="Every task with its project, estimate and dates."
        >
          <a
            className="nx-btn nx-btn-secondary"
            href="/api/export/tasks?includeCompleted=true"
            download="needt-tasks.json"
          >
            <FiDownload size={14} aria-hidden />
            JSON
          </a>
        </SRow>
        <SRow
          title="Export all"
          desc="Tasks, documents, habits, boards and settings in one file, sent by email."
        >
          <SBtn
            icon={<FiDownload size={14} aria-hidden />}
            disabled={busy === "all"}
            onClick={() => void requestAll()}
          >
            Email me the export
          </SBtn>
        </SRow>
      </SGroup>
      <SGroup title="Privacy">
        <SRow
          title="Share usage data"
          desc="Anonymous counts of which features get used. Never the content of your tasks, documents or mail."
        >
          <V3Switch
            label="Share usage data"
            checked={readPref(settings.data?.prefs, "usage")}
            onChange={(v) => void setPref("usage", v).then(mark)}
          />
        </SRow>
      </SGroup>
      <SGroup title="This device">
        <SRow
          title="Download everything again"
          desc="Clears what this device keeps and fetches it fresh. Nothing is deleted."
        >
          <SBtn disabled={busy === "device"} onClick={() => void again()}>
            Download again
          </SBtn>
        </SRow>
      </SGroup>
    </>
  );
}
