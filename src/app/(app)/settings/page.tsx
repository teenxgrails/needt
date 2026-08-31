"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";

import Link from "next/link";

import {
  Bell,
  Bot,
  CalendarCheck2,
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
  Search,
  Settings2,
  SlidersHorizontal,
  UserRound,
  UsersRound,
} from "lucide-react";

import { AIAssistantSettings } from "@/components/settings/AIAssistantSettings";
import { AccountManager } from "@/components/settings/AccountManager";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { AutoScheduleSettings } from "@/components/settings/AutoScheduleSettings";
import { BillingSettings } from "@/components/settings/BillingSettings";
import { BookingSettings } from "@/components/settings/BookingSettings";
import { CalendarSettings } from "@/components/settings/CalendarSettings";
import { ConnectorSettings } from "@/components/settings/ConnectorSettings";
import { CustomizationSettings } from "@/components/settings/CustomizationSettings";
import { DataSettings } from "@/components/settings/DataSettings";
import { DesktopSettings } from "@/components/settings/DesktopSettings";
import { ImportExportSettings } from "@/components/settings/ImportExportSettings";
import { IntegrationSettings } from "@/components/settings/IntegrationSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { OnboardingChecklist } from "@/components/settings/OnboardingChecklist";
import { ReportBugDialog } from "@/components/settings/ReportBugDialog";
import { ScheduleSettings } from "@/components/settings/ScheduleSettings";
import { SettingsPanelBoundary } from "@/components/settings/SettingsPanelBoundary";
import { TaskDefaultsSettings } from "@/components/settings/TaskDefaultsSettings";
import { UserSettings } from "@/components/settings/UserSettings";
import { WorkspaceSettings } from "@/components/settings/WorkspaceSettings";
import { Input } from "@/components/ui/input";

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
  | "billing"
  | "bookings"
  | "workspace";

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
  { id: "bookings", label: "Booking links", icon: CalendarCheck2 },
  { id: "desktop", label: "Desktop app", icon: Laptop },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "api", label: "API", icon: Code2 },
  { id: "privacy", label: "Privacy", icon: Eye },
  { id: "ai", label: "AI Assistant", icon: Bot },
];

const ACCOUNT_TABS: SettingsNavItem[] = [
  { id: "account", label: "Account settings", icon: UserRound },
  { id: "workspace", label: "Workspace", icon: UsersRound },
  { id: "billing", label: "Billing", icon: CreditCard },
];

const MOBILE_TAB_GROUPS: Array<{
  label: string;
  items: SettingsNavItem[];
}> = [
  {
    label: "Planner",
    items: GENERAL_TABS.filter(({ id }) =>
      [
        "calendars",
        "auto-scheduling",
        "task-defaults",
        "schedules",
        "bookings",
      ].includes(id)
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
                "relative flex h-[31px] items-center gap-2 rounded-[4px] px-2 text-[13px] font-medium transition-colors duration-150",
                activeTab === item.id
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              )}
              aria-current={activeTab === item.id ? "page" : undefined}
            >
              {activeTab === item.id && (
                <span className="absolute inset-0 z-0 rounded-[4px] bg-[var(--surface-hover)]" />
              )}
              <Icon className="relative z-10 h-4 w-4" strokeWidth={1.7} />
              <span className="relative z-10">{item.label}</span>
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
  const [search, setSearch] = useState("");
  const initializeSettings = useSettingsStore(
    (state) => state.initializeSettings
  );

  const filteredTabGroups = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return MOBILE_TAB_GROUPS;
    return MOBILE_TAB_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.label.toLocaleLowerCase().includes(query)
      ),
    })).filter((group) => group.items.length > 0);
  }, [search]);
  const activeLabel =
    [...GENERAL_TABS, ...ACCOUNT_TABS].find((tab) => tab.id === activeTab)
      ?.label ?? "Settings";

  useEffect(() => {
    initializeSettings();
  }, [initializeSettings]);

  useLayoutEffect(() => {
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

  const searchField = (
    <label className="flex min-h-11 items-center gap-2 rounded-[var(--control-radius)] border border-[var(--border-control)] bg-[var(--surface-raised)] px-3 text-[var(--text-muted)]">
      <Search className="h-4 w-4 shrink-0" />
      <Input
        aria-label="Search settings"
        className="h-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search settings"
        type="search"
        value={search}
      />
    </label>
  );

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
          </div>
        );
      case "task-defaults":
        return (
          <div className="space-y-9">
            <TaskDefaultsSettings />
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
      case "bookings":
        return <BookingSettings />;
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
        return (
          <div className="space-y-9">
            <OnboardingChecklist />
            <AccountSettings />
          </div>
        );
      case "workspace":
        return <WorkspaceSettings />;
      case "billing":
        return <BillingSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="needt-page-depth h-dvh overflow-hidden text-[var(--text-primary)]">
      <div className="flex h-full min-h-0">
        <aside className="needt-panel-depth settings-desktop-sidebar fixed inset-y-0 left-0 z-20 flex w-[230px] flex-col overflow-hidden border-r border-[var(--border-subtle)]">
          <Link
            href="/calendar"
            className="mx-2 mb-2 mt-2 flex h-[25px] shrink-0 items-center gap-1 rounded-[4px] px-1.5 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to Needt
          </Link>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 pb-3">
            {searchField}
            {filteredTabGroups.map((group) => (
              <SettingsNavGroup
                key={group.label}
                label={group.label}
                items={group.items}
                activeTab={activeTab}
                onSelect={selectTab}
              />
            ))}
            {filteredTabGroups.length === 0 && (
              <p className="px-2 text-xs text-[var(--text-muted)]">
                No settings match &quot;{search.trim()}&quot;.
              </p>
            )}
          </div>
          <div className="shrink-0 border-t border-[var(--border-subtle)] p-2">
            <ReportBugDialog />
          </div>
        </aside>

        <main className="needt-page-depth settings-main h-full min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-none">
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
              "w-full max-w-[840px] px-4 py-5 pb-24 transition-opacity duration-150 sm:px-6 md:px-10 md:py-7 md:pb-16",
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
              {searchField}
              {filteredTabGroups.map((group) => (
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
              {filteredTabGroups.length === 0 && (
                <p className="rounded-[var(--panel-radius)] border border-dashed border-[var(--border-subtle)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                  No settings match &quot;{search.trim()}&quot;.
                </p>
              )}
              <ReportBugDialog mobile />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
