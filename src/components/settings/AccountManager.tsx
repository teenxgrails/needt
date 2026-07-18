"use client";

import { useEffect, useState } from "react";

import { Plus } from "lucide-react";
import { FaApple, FaMicrosoft } from "react-icons/fa";
import { SiGooglecalendar } from "react-icons/si";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { logger } from "@/lib/logger";

import { useSettingsStore } from "@/store/settings";

import { AvailableCalendars } from "./AvailableCalendars";
import { CalDAVAccountForm } from "./CalDAVAccountForm";
import { SettingsSection } from "./SettingsSection";

const LOG_SOURCE = "AccountManager";

interface IntegrationStatus {
  google: { configured: boolean };
  outlook: { configured: boolean };
}

const DEFAULT_INTEGRATION_STATUS: IntegrationStatus = {
  google: { configured: false },
  outlook: { configured: false },
};

function ProviderIcon({
  provider,
  className = "h-4 w-4",
}: {
  provider: "GOOGLE" | "OUTLOOK" | "CALDAV";
  className?: string;
}) {
  if (provider === "GOOGLE") {
    return <SiGooglecalendar className={className} aria-hidden="true" />;
  }
  if (provider === "OUTLOOK") {
    return (
      <FaMicrosoft
        className={`${className} text-[#6CA9FF]`}
        aria-hidden="true"
      />
    );
  }
  return (
    <FaApple
      className={`${className} text-[var(--text-secondary)]`}
      aria-hidden="true"
    />
  );
}

export function AccountManager() {
  const { accounts, calendar, refreshAccounts } = useSettingsStore();
  const connectedAccounts = Array.isArray(accounts) ? accounts : [];
  const [calendarAccountId, setCalendarAccountId] = useState<string | null>(
    null
  );
  const [showCalDAVForm, setShowCalDAVForm] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>(
    DEFAULT_INTEGRATION_STATUS
  );

  useEffect(() => {
    void refreshAccounts();
  }, [refreshAccounts]);

  useEffect(() => {
    fetch("/api/integration-status")
      .then(async (response) => {
        if (!response.ok) return DEFAULT_INTEGRATION_STATUS;
        return (await response.json()) as IntegrationStatus;
      })
      .then((status) => setIntegrationStatus(status))
      .catch((error) => {
        logger.error(
          "Failed to load calendar provider status",
          { error: error instanceof Error ? error.message : "Unknown error" },
          LOG_SOURCE
        );
      });
  }, []);

  const connectProvider = (provider: "GOOGLE" | "OUTLOOK") => {
    const configured =
      provider === "GOOGLE"
        ? integrationStatus.google.configured
        : integrationStatus.outlook.configured;
    if (!configured) {
      toast.info(
        `${provider === "GOOGLE" ? "Google" : "Outlook"} Calendar is not configured yet`
      );
      return;
    }
    window.location.href =
      provider === "GOOGLE"
        ? "/api/calendar/google/auth"
        : "/api/calendar/outlook/auth";
  };

  const selectedAccount = connectedAccounts.find(
    (account) => account.id === calendarAccountId
  );

  return (
    <>
      <SettingsSection title="Accounts">
        <div className="overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
          {connectedAccounts.length === 0 ? (
            <div className="flex min-h-[58px] items-center px-4 text-[13px] text-[var(--text-secondary)]">
              No calendar accounts connected yet.
            </div>
          ) : (
            connectedAccounts.map((account) => {
              const isMain =
                account.calendars.some(
                  (feed) => feed.id === calendar.defaultCalendarId
                ) ||
                (!calendar.defaultCalendarId &&
                  account.id === connectedAccounts[0]?.id);
              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => setCalendarAccountId(account.id)}
                  className="flex min-h-[58px] w-full items-center gap-3 border-t border-[var(--border-subtle)] px-4 text-left transition-colors first:border-t-0 hover:bg-[var(--surface-hover)]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-control)]">
                    <ProviderIcon provider={account.provider} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px]">
                    {account.email}
                  </span>
                  {isMain && (
                    <span className="rounded-full bg-[var(--surface-control)] px-2 py-0.5 text-[12px] text-[var(--text-secondary)]">
                      Main Calendar
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="mt-3 flex h-8 items-center gap-2 rounded-[var(--control-radius)] px-2 text-[13px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              <Plus className="h-4 w-4" />
              Add account
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[310px]">
            <DropdownMenuItem
              disabled={!integrationStatus.google.configured}
              onSelect={() => connectProvider("GOOGLE")}
              className="min-h-10 rounded-[var(--control-radius)] px-3 text-[14px]"
            >
              <SiGooglecalendar className="h-5 w-5" />
              Add Google Calendar
              {!integrationStatus.google.configured && (
                <span className="ml-auto text-[11px] text-[var(--text-muted)]">
                  Not configured
                </span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!integrationStatus.outlook.configured}
              onSelect={() => connectProvider("OUTLOOK")}
              className="min-h-10 rounded-[var(--control-radius)] px-3 text-[14px]"
            >
              <FaMicrosoft className="h-5 w-5 text-[#6CA9FF]" />
              Add Outlook Calendar
              {!integrationStatus.outlook.configured && (
                <span className="ml-auto text-[11px] text-[var(--text-muted)]">
                  Not configured
                </span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setShowCalDAVForm(true)}
              className="min-h-10 rounded-[var(--control-radius)] px-3 text-[14px]"
            >
              <FaApple className="h-5 w-5 text-[var(--text-secondary)]" />
              Add iCloud Calendar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SettingsSection>

      <Dialog
        open={Boolean(selectedAccount)}
        onOpenChange={(open) => !open && setCalendarAccountId(null)}
      >
        <DialogContent className="max-h-[min(720px,calc(100dvh-32px))] max-w-[620px] overflow-y-auto p-0">
          <DialogHeader className="border-b border-[var(--border-subtle)] p-5 pr-12">
            <DialogTitle>Manage Calendars</DialogTitle>
            <DialogDescription>
              {selectedAccount?.email || "Connected calendar account"}
            </DialogDescription>
          </DialogHeader>
          <div className="p-5">
            {selectedAccount && (
              <AvailableCalendars
                accountId={selectedAccount.id}
                provider={selectedAccount.provider}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCalDAVForm} onOpenChange={setShowCalDAVForm}>
        <DialogContent className="max-h-[min(760px,calc(100dvh-32px))] max-w-[680px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Connect iCloud Calendar</DialogTitle>
            <DialogDescription>
              Use an app-specific password from your Apple ID account.
            </DialogDescription>
          </DialogHeader>
          <CalDAVAccountForm
            onSuccess={() => {
              setShowCalDAVForm(false);
              void refreshAccounts();
            }}
            onCancel={() => setShowCalDAVForm(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
