"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import {
  Bell,
  Bot,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Code2,
  CreditCard,
  Eye,
  Laptop,
  Palette,
  Plug,
  Settings2,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";

import { AIAssistantSettings } from "@/components/settings/AIAssistantSettings";
import { AccountManager } from "@/components/settings/AccountManager";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { AutoScheduleSettings } from "@/components/settings/AutoScheduleSettings";
import { BillingSettings } from "@/components/settings/BillingSettings";
import { CalendarSettings } from "@/components/settings/CalendarSettings";
import { ConnectorSettings } from "@/components/settings/ConnectorSettings";
import { CustomizationSettings } from "@/components/settings/CustomizationSettings";
import { DataSettings } from "@/components/settings/DataSettings";
import { DesktopSettings } from "@/components/settings/DesktopSettings";
import { ImportExportSettings } from "@/components/settings/ImportExportSettings";
import { IntegrationSettings } from "@/components/settings/IntegrationSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { ScheduleSettings } from "@/components/settings/ScheduleSettings";
import { SettingsPanelBoundary } from "@/components/settings/SettingsPanelBoundary";
import { SmartSchedulingSettings } from "@/components/settings/SmartSchedulingSettings";
import { TaskDefaultsSettings } from "@/components/settings/TaskDefaultsSettings";
import { TaskUrgencySettings } from "@/components/settings/TaskUrgencySettings";
import { UserSettings } from "@/components/settings/UserSettings";
import { cn } from "@/lib/utils";

import { useSettingsStore } from "@/store/settings";

type SettingsTab =
  | "calendars"
  | "auto-scheduling"
  | "task-defaults"
  | "theme"
  | "timezone"
  | "notifications"
  | "schedules"
  | "desktop"
  | "integrations"
  | "api"
  | "privacy"
  | "ai"
  | "account"
  | "billing";

interface SettingsNavItem {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const GENERAL_TABS: SettingsNavItem[] = [
  { id: "calendars", label: "Calendars", icon: CalendarDays },
  {
    id: "auto-scheduling",
    label: "Auto-scheduling",
    icon: SlidersHorizontal,
  },
  { id: "task-defaults", label: "Task defaults", icon: CheckCircle2 },
  { id: "theme", label: "Appearance", icon: Palette },
  { id: "timezone", label: "Timezone", icon: Clock3 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "schedules", label: "Schedules", icon: CalendarRange },
  { id: "desktop", label: "Desktop app", icon: Laptop },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "api", label: "API", icon: Code2 },
  { id: "privacy", label: "Privacy", icon: Eye },
  { id: "ai", label: "AI Assistant", icon: Bot },
];

const ACCOUNT_TABS: SettingsNavItem[] = [
  { id: "account", label: "Account settings", icon: UserRound },
  { id: "billing", label: "Billing", icon: CreditCard },
];

const MOBILE_TAB_GROUPS: Array<{
  label: string;
  items: SettingsNavItem[];
}> = [
  {
    label: "Planner",
    items: GENERAL_TABS.filter(({ id }) =>
      ["calendars", "auto-scheduling", "task-defaults", "schedules"].includes(
        id
      )
    ),
  },
  {
    label: "Preferences",
    items: GENERAL_TABS.filter(({ id }) =>
      ["theme", "timezone", "notifications", "desktop"].includes(id)
    ),
  },
  {
    label: "Connections",
    items: GENERAL_TABS.filter(({ id }) =>
      ["integrations", "api", "privacy", "ai"].includes(id)
    ),
  },
  { label: "Account", items: ACCOUNT_TABS },
];

const LEGACY_TAB_MAP: Record<string, SettingsTab> = {
  calendar: "calendars",
  scheduling: "auto-scheduling",
  "auto-schedule": "auto-scheduling",
  "smart-scheduling": "auto-scheduling",
  tasks: "task-defaults",
  "task-sync": "integrations",
  "task-urgency": "task-defaults",
  appearance: "theme",
  user: "theme",
  customization: "theme",
  "ai-assistant": "ai",
  connectors: "api",
  "import-export": "privacy",
  accounts: "account",
  subscription: "billing",
};

const ALL_TAB_IDS = [...GENERAL_TABS, ...ACCOUNT_TABS].map(({ id }) => id);

function SettingsNavGroup({
  activeTab,
  items,
  label,
  onSelect,
}: {
  activeTab: SettingsTab;
  items: SettingsNavItem[];
  label: string;
  onSelect: (tab: SettingsTab) => void;
}) {
  return (
    <div>
      <div className="px-2 pb-1 text-[12px] font-medium leading-5 text-[var(--text-muted)]">
        {label}
      </div>
      <nav className="space-y-px" aria-label={`${label} settings`}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(event) => {
                event.preventDefault();
                onSelect(item.id);
              }}
              className={cn(
                "flex h-[31px] items-center gap-2 rounded-[4px] px-2 text-[13px] font-medium transition-colors duration-150",
                activeTab === item.id
                  ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              )}
              aria-current={activeTab === item.id ? "page" : undefined}
            >
              <Icon className="h-4 w-4" strokeWidth={1.7} />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("calendars");
  const [isHydrated, setIsHydrated] = useState(false);
  const [mobileOverview, setMobileOverview] = useState(true);
  const initializeSettings = useSettingsStore(
    (state) => state.initializeSettings
  );

  const accountTabs = useMemo(() => ACCOUNT_TABS, []);
  const activeLabel =
    [...GENERAL_TABS, ...ACCOUNT_TABS].find((tab) => tab.id === activeTab)
      ?.label ?? "Settings";

  useEffect(() => {
    initializeSettings();
  }, [initializeSettings]);

  useEffect(() => {
    const readHash = () => {
      const rawHash = window.location.hash.slice(1);
      const hash = LEGACY_TAB_MAP[rawHash] ?? rawHash;
      if (ALL_TAB_IDS.includes(hash as SettingsTab)) {
        setActiveTab(hash as SettingsTab);
        setMobileOverview(false);
      } else if (!rawHash) {
        setMobileOverview(true);
      }
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    setIsHydrated(true);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  useEffect(() => {
    if (
      isHydrated &&
      !mobileOverview &&
      window.location.hash.slice(1) !== activeTab
    ) {
      window.history.replaceState(null, "", `#${activeTab}`);
    }
  }, [activeTab, isHydrated, mobileOverview]);

  const selectTab = (tab: SettingsTab) => {
    setActiveTab(tab);
    setMobileOverview(false);
    window.history.replaceState(null, "", `#${tab}`);
  };

  const showMobileOverview = () => {
    setMobileOverview(true);
    window.history.replaceState(null, "", window.location.pathname);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "calendars":
        return (
          <div className="space-y-9">
            <AccountManager />
            <CalendarSettings />
          </div>
        );
      case "auto-scheduling":
        return (
          <div className="space-y-9">
            <AutoScheduleSettings />
            <SmartSchedulingSettings />
          </div>
        );
      case "task-defaults":
        return (
          <div className="space-y-9">
            <TaskDefaultsSettings />
            <TaskUrgencySettings />
          </div>
        );
      case "theme":
        return (
          <div className="space-y-9">
            <UserSettings page="theme" />
            <CustomizationSettings />
          </div>
        );
      case "timezone":
        return <UserSettings page="timezone" />;
      case "notifications":
        return <NotificationSettings />;
      case "schedules":
        return <ScheduleSettings />;
      case "desktop":
        return <DesktopSettings />;
      case "integrations":
        return <IntegrationSettings />;
      case "api":
        return <ConnectorSettings />;
      case "privacy":
        return (
          <div className="space-y-9">
            <ImportExportSettings />
            <DataSettings />
          </div>
        );
      case "ai":
        return <AIAssistantSettings />;
      case "account":
        return <AccountSettings />;
      case "billing":
        return <BillingSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="needt-page-depth min-h-screen text-[var(--text-primary)]">
      <div className="flex min-h-screen">
        <aside className="needt-panel-depth settings-desktop-sidebar fixed inset-y-0 left-0 z-20 w-[230px] overflow-y-auto border-r border-[var(--border-subtle)] p-2">
          <Link
            href="/calendar"
            className="mb-3 flex h-[25px] items-center gap-1 rounded-[4px] px-1.5 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to Needt
          </Link>
          <div className="space-y-4">
            <SettingsNavGroup
              label="General"
              items={GENERAL_TABS}
              activeTab={activeTab}
              onSelect={selectTab}
            />
            <SettingsNavGroup
              label="Account"
              items={accountTabs}
              activeTab={activeTab}
              onSelect={selectTab}
            />
          </div>
        </aside>

        <main className="needt-page-depth settings-main min-h-screen min-w-0 flex-1">
          <div className="needt-panel-depth settings-mobile-header sticky top-0 z-30 min-h-16 items-center gap-2 border-b border-[var(--border-subtle)] px-3">
            {mobileOverview ? (
              <Link
                href="/calendar"
                aria-label="Back to Needt"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--control-radius)] text-[var(--text-secondary)] transition-colors active:bg-[var(--surface-hover)] active:text-[var(--text-primary)]"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={showMobileOverview}
                aria-label="Back to Settings"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--control-radius)] text-[var(--text-secondary)] transition-colors active:bg-[var(--surface-hover)] active:text-[var(--text-primary)]"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <div className="flex min-w-0 items-center gap-2">
              {mobileOverview && (
                <Settings2 className="h-5 w-5 text-[var(--text-secondary)]" />
              )}
              <h1 className="truncate text-[17px] font-semibold leading-6">
                {mobileOverview ? "Settings" : activeLabel}
              </h1>
            </div>
          </div>
          <header className="needt-panel-depth settings-desktop-header sticky top-0 z-10 h-[57px] items-center border-b border-[var(--border-subtle)] px-12">
            <h1 className="text-[18px] font-semibold leading-7">
              {activeLabel}
            </h1>
          </header>
          <div
            className={cn(
              "mx-auto w-full max-w-[1040px] px-4 py-5 pb-24 transition-opacity duration-150 sm:px-6 md:px-12 md:py-7 md:pb-16",
              mobileOverview && "hidden lg:block",
              !isHydrated && "opacity-0"
            )}
          >
            <SettingsPanelBoundary resetKey={activeTab}>
              {renderTabContent()}
            </SettingsPanelBoundary>
          </div>

          <div
            className={cn(
              "settings-mobile-overview px-4 pb-28 pt-6",
              !mobileOverview && "hidden",
              !isHydrated && "opacity-0"
            )}
          >
            <div className="mx-auto max-w-xl space-y-7">
              {MOBILE_TAB_GROUPS.map((group) => (
                <section
                  key={group.label}
                  aria-labelledby={`mobile-${group.label}`}
                >
                  <h2
                    id={`mobile-${group.label}`}
                    className="mb-2 px-1 text-[13px] font-semibold text-[var(--text-secondary)]"
                  >
                    {group.label}
                  </h2>
                  <div className="overflow-hidden rounded-[calc(var(--control-radius)+4px)] border border-[var(--border-subtle)] bg-[var(--surface-canvas)]">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => selectTab(item.id)}
                          className="flex min-h-14 w-full items-center gap-3 border-b border-[var(--border-subtle)] px-3 text-left text-[15px] text-[var(--text-primary)] transition-colors last:border-b-0 active:bg-[var(--surface-hover)]"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--control-radius)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                            <Icon
                              className="h-[18px] w-[18px]"
                              strokeWidth={1.7}
                            />
                          </span>
                          <span className="min-w-0 flex-1 font-medium">
                            {item.label}
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
