"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Bell,
  Brain,
  CalendarDays,
  Download,
  ListChecks,
  Palette,
  Plug,
  ScrollText,
  Server,
  Sparkles,
  UserRound,
} from "lucide-react";

import { AIAssistantSettings } from "@/components/settings/AIAssistantSettings";
import { AccountManager } from "@/components/settings/AccountManager";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { AutoScheduleSettings } from "@/components/settings/AutoScheduleSettings";
import { CalendarSettings } from "@/components/settings/CalendarSettings";
import { ConnectorSettings } from "@/components/settings/ConnectorSettings";
import { CustomizationSettings } from "@/components/settings/CustomizationSettings";
import { DataSettings } from "@/components/settings/DataSettings";
import { ImportExportSettings } from "@/components/settings/ImportExportSettings";
import { LogViewer } from "@/components/settings/LogViewer";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { SettingsPanelBoundary } from "@/components/settings/SettingsPanelBoundary";
import { SmartSchedulingSettings } from "@/components/settings/SmartSchedulingSettings";
import { SystemSettings } from "@/components/settings/SystemSettings";
import { TaskSyncSettings } from "@/components/settings/TaskSyncSettings";
import { TaskUrgencySettings } from "@/components/settings/TaskUrgencySettings";
import { UserSettings } from "@/components/settings/UserSettings";

import { cn } from "@/lib/utils";

import { useAdmin } from "@/hooks/use-admin";

import { useSettingsStore } from "@/store/settings";

type SettingsTab =
  | "account"
  | "calendars"
  | "scheduling"
  | "tasks"
  | "appearance"
  | "ai"
  | "integrations"
  | "system"
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
      { id: "calendars", label: "Calendars", icon: CalendarDays },
      { id: "scheduling", label: "Scheduling", icon: Brain },
      { id: "tasks", label: "Tasks", icon: ListChecks },
      { id: "appearance", label: "Appearance", icon: Palette },
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "ai", label: "AI", icon: Sparkles },
      { id: "integrations", label: "Integrations", icon: Plug },
      { id: "import-export", label: "Import / Export", icon: Download },
      { id: "account", label: "Account", icon: UserRound },
    ] as const;

    // Add admin-only tabs
    if (isAdmin) {
      const adminTabs = [
        { id: "system", label: "System", icon: Server },
        { id: "logs", label: "Logs", icon: ScrollText },
      ] as const;

      return [...baseTabs, ...adminTabs] as const;
    }

    return baseTabs;
  }, [isAdmin]);

  const [activeTab, setActiveTab] = useState<SettingsTab>("calendars");

  // Check initial hash and handle changes
  useEffect(() => {
    const handleHashChange = () => {
      const rawHash = window.location.hash.slice(1);
      const legacyTabMap: Record<string, SettingsTab> = {
        calendar: "calendars",
        "auto-schedule": "scheduling",
        "smart-scheduling": "scheduling",
        "task-sync": "tasks",
        "task-urgency": "tasks",
        user: "appearance",
        customization: "appearance",
        "ai-assistant": "ai",
        connectors: "integrations",
        accounts: "account",
      };
      const hash = (legacyTabMap[rawHash] || rawHash) as SettingsTab;

      // Check if the hash is a valid tab ID, regardless of admin status
      const allPossibleTabIds: SettingsTab[] = [
        "account",
        "calendars",
        "scheduling",
        "tasks",
        "appearance",
        "ai",
        "integrations",
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
      case "account":
        return <AccountSettings />;
      case "calendars":
        return (
          <div className="space-y-10">
            <AccountManager />
            <CalendarSettings />
          </div>
        );
      case "scheduling":
        return (
          <div className="space-y-10">
            <AutoScheduleSettings />
            <SmartSchedulingSettings />
          </div>
        );
      case "tasks":
        return (
          <div className="space-y-10">
            <TaskSyncSettings />
            <TaskUrgencySettings />
          </div>
        );
      case "appearance":
        return (
          <div className="space-y-10">
            <UserSettings />
            <CustomizationSettings />
          </div>
        );
      case "ai":
        return <AIAssistantSettings />;
      case "integrations":
        return <ConnectorSettings />;
      case "notifications":
        return <NotificationSettings />;
      case "system":
        return <SystemSettings />;
      case "logs":
        return <LogViewer />;
      case "import-export":
        return (
          <div className="space-y-10">
            <ImportExportSettings />
            <DataSettings />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1D1E] text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="border-b border-[#2B2F31] lg:w-[244px] lg:flex-none lg:border-b-0 lg:border-r">
          <div className="sticky top-0 p-2">
            <a
              href="/calendar"
              className="mb-2 flex h-[30px] items-center rounded-[2px] px-2.5 text-[13px] text-[#9BA1A6] transition-colors duration-150 ease-out hover:bg-[#2B2F31] hover:text-white"
            >
              Back to Flowday
            </a>
            <div className="space-y-3">
              <div>
                <div className="ml-2 pb-1 text-[13px] font-medium leading-[17px] text-[#697177]">
                  General
                </div>
                <nav className="space-y-0.5">
                  {tabs
                    .filter(
                      (tab) => !["account", "system", "logs"].includes(tab.id)
                    )
                    .map((tab) => {
                      const Icon = tab.icon;

                      return (
                        <a
                          key={tab.id}
                          href={`#${tab.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            setActiveTab(tab.id as SettingsTab);
                          }}
                          className={cn(
                            "flex h-[32px] w-full items-center gap-2.5 rounded-[4px] px-2.5 text-[14px] font-medium leading-[21px] transition-colors duration-150 ease-out",
                            activeTab === tab.id
                              ? "bg-[#2B2F31] text-white"
                              : "text-[#9AA0A6] hover:bg-[#2B2F31] hover:text-white"
                          )}
                        >
                          <Icon
                            className="h-4 w-4 shrink-0"
                            strokeWidth={1.75}
                          />
                          {tab.label}
                        </a>
                      );
                    })}
                </nav>
              </div>
              <div>
                <div className="ml-2 pb-1 text-[13px] font-medium leading-[17px] text-[#697177]">
                  Account
                </div>
                <nav className="space-y-0.5">
                  {tabs
                    .filter((tab) =>
                      ["account", "system", "logs"].includes(tab.id)
                    )
                    .map((tab) => {
                      const Icon = tab.icon;

                      return (
                        <a
                          key={tab.id}
                          href={`#${tab.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            setActiveTab(tab.id as SettingsTab);
                          }}
                          className={cn(
                            "flex h-[32px] w-full items-center gap-2.5 rounded-[4px] px-2.5 text-[14px] font-medium leading-[21px] transition-colors duration-150 ease-out",
                            activeTab === tab.id
                              ? "bg-[#2B2F31] text-white"
                              : "text-[#9AA0A6] hover:bg-[#2B2F31] hover:text-white"
                          )}
                        >
                          <Icon
                            className="h-4 w-4 shrink-0"
                            strokeWidth={1.75}
                          />
                          {tab.label}
                        </a>
                      );
                    })}
                </nav>
              </div>
            </div>
          </div>
        </aside>
        <div className="min-w-0 flex-1 px-5 py-3 sm:px-[34px]">
          <div className={cn("space-y-6", !isHydrated && "opacity-0")}>
            <div>
              <h1 className="text-lg font-semibold leading-7">
                {tabs.find((tab) => tab.id === activeTab)?.label ?? "Settings"}
              </h1>
            </div>
            <div key={activeTab}>
              <SettingsPanelBoundary resetKey={activeTab}>
                {renderContent()}
              </SettingsPanelBoundary>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
