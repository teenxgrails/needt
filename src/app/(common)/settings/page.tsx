"use client";

import { useEffect, useMemo, useState } from "react";

import { AIAssistantSettings } from "@/components/settings/AIAssistantSettings";
import { AccountManager } from "@/components/settings/AccountManager";
import { AutoScheduleSettings } from "@/components/settings/AutoScheduleSettings";
import { CalendarSettings } from "@/components/settings/CalendarSettings";
import { ConnectorSettings } from "@/components/settings/ConnectorSettings";
import { ImportExportSettings } from "@/components/settings/ImportExportSettings";
import { LogViewer } from "@/components/settings/LogViewer";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { SmartSchedulingSettings } from "@/components/settings/SmartSchedulingSettings";
import { SystemSettings } from "@/components/settings/SystemSettings";
import { TaskSyncSettings } from "@/components/settings/TaskSyncSettings";
import { UserSettings } from "@/components/settings/UserSettings";

import { cn } from "@/lib/utils";

import { useAdmin } from "@/hooks/use-admin";

import { useSettingsStore } from "@/store/settings";

type SettingsTab =
  | "accounts"
  | "user"
  | "calendar"
  | "auto-schedule"
  | "smart-scheduling"
  | "ai-assistant"
  | "connectors"
  | "system"
  | "task-sync"
  | "logs"
  | "import-export"
  | "notifications";

export default function SettingsPage() {
  const [isHydrated, setIsHydrated] = useState(false);
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();
  const { initializeSettings } = useSettingsStore();

  // Always initialize settings on mount
  useEffect(() => {
    initializeSettings();
  }, [initializeSettings]);

  const tabs = useMemo(() => {
    const baseTabs = [
      { id: "calendar", label: "Calendars / Apple-iCloud" },
      { id: "auto-schedule", label: "Auto-scheduling" },
      { id: "task-sync", label: "Task defaults" },
      { id: "user", label: "Theme" },
      { id: "notifications", label: "Notifications" },
      { id: "smart-scheduling", label: "Energy profile" },
      { id: "connectors", label: "Connectors" },
      { id: "ai-assistant", label: "AI" },
      { id: "accounts", label: "Account" },
      { id: "import-export", label: "Import / Export" },
    ] as const;

    // Add admin-only tabs
    if (isAdmin) {
      const adminTabs = [
        { id: "system", label: "System" },
        { id: "logs", label: "Logs" },
      ] as const;

      return [...baseTabs, ...adminTabs] as const;
    }

    return baseTabs;
  }, [isAdmin]);

  const [activeTab, setActiveTab] = useState<SettingsTab>("calendar");

  // Check initial hash and handle changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) as SettingsTab;

      // Check if the hash is a valid tab ID, regardless of admin status
      const allPossibleTabIds: SettingsTab[] = [
        "accounts",
        "user",
        "calendar",
        "auto-schedule",
        "smart-scheduling",
        "ai-assistant",
        "connectors",
        "task-sync",
        "system",
        "logs",
        "import-export",
        "notifications",
      ];

      if (allPossibleTabIds.includes(hash)) {
        setActiveTab(hash);
      }
    };

    // Handle initial hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []); // Remove tabs dependency since we're now checking against all possible tabs

  // Set hydrated state after mount
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Update hash when tab changes
  useEffect(() => {
    if (isHydrated) {
      window.location.hash = activeTab;
    }
  }, [activeTab, isHydrated]);

  const renderContent = () => {
    // Admin-only tabs
    const adminOnlyTabs = ["system", "logs"];

    // If admin status is still loading and the active tab is admin-only, show loading state
    if (adminOnlyTabs.includes(activeTab) && isAdminLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-muted-foreground">Checking access privileges...</p>
        </div>
      );
    }

    // Check if the active tab is admin-only and the user is not an admin
    if (adminOnlyTabs.includes(activeTab) && !isAdmin) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <h2 className="mb-4 text-2xl font-bold">Admin Access Required</h2>
          <p className="text-muted-foreground">
            You need administrator privileges to access this section.
          </p>
        </div>
      );
    }

    switch (activeTab) {
      case "accounts":
        return <AccountManager />;
      case "user":
        return <UserSettings />;
      case "calendar":
        return <CalendarSettings />;
      case "auto-schedule":
        return <AutoScheduleSettings />;
      case "smart-scheduling":
        return <SmartSchedulingSettings />;
      case "ai-assistant":
        return <AIAssistantSettings />;
      case "connectors":
        return <ConnectorSettings />;
      case "task-sync":
        return <TaskSyncSettings />;
      case "notifications":
        return <NotificationSettings />;
      case "system":
        return <SystemSettings />;
      case "logs":
        return <LogViewer />;
      case "import-export":
        return <ImportExportSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-full bg-[#1A1D1E] px-3 py-4 text-white sm:px-5">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-4 lg:flex-row">
        <aside className="lg:w-[230px] lg:flex-none">
          <div className="sticky top-20 rounded-md border border-[#323234] bg-[#262627] p-2">
            <a
              href="/calendar"
              className="mb-3 flex rounded-md px-3 py-2 text-sm text-[#9AA0A6] hover:bg-[#2B2F31] hover:text-white"
            >
              ← Back
            </a>
            <div className="space-y-4">
              <div>
                <div className="px-3 pb-1 text-xs font-medium uppercase text-[#9AA0A6]">
                  General
                </div>
                <nav className="space-y-1">
                  {tabs
                    .filter(
                      (tab) => !["accounts", "system", "logs"].includes(tab.id)
                    )
                    .map((tab) => (
                      <a
                        key={tab.id}
                        href={`#${tab.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab(tab.id as SettingsTab);
                        }}
                        className={cn(
                          "flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          !isHydrated && "duration-0",
                          activeTab === tab.id
                            ? "bg-[#2B2F31] text-white"
                            : "text-[#9AA0A6] hover:bg-[#2B2F31] hover:text-white"
                        )}
                      >
                        {tab.label}
                      </a>
                    ))}
                </nav>
              </div>
              <div>
                <div className="px-3 pb-1 text-xs font-medium uppercase text-[#9AA0A6]">
                  Account
                </div>
                <nav className="space-y-1">
                  {tabs
                    .filter((tab) =>
                      ["accounts", "system", "logs"].includes(tab.id)
                    )
                    .map((tab) => (
                      <a
                        key={tab.id}
                        href={`#${tab.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab(tab.id as SettingsTab);
                        }}
                        className={cn(
                          "flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          !isHydrated && "duration-0",
                          activeTab === tab.id
                            ? "bg-[#2B2F31] text-white"
                            : "text-[#9AA0A6] hover:bg-[#2B2F31] hover:text-white"
                        )}
                      >
                        {tab.label}
                      </a>
                    ))}
                </nav>
              </div>
            </div>
          </div>
        </aside>
        <div className="min-w-0 flex-1 lg:max-w-[820px]">
          <div className={cn("space-y-6", !isHydrated && "opacity-0")}>
            <div>
              <h1 className="text-xl font-semibold">
                {tabs.find((tab) => tab.id === activeTab)?.label ?? "Settings"}
              </h1>
              <p className="mt-1 text-sm text-[#9AA0A6]">
                Configure Mina without leaving the planner flow.
              </p>
            </div>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
