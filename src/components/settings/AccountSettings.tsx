"use client";

import Image from "next/image";

import { UserRound } from "lucide-react";

import { useAppSession } from "@/components/providers/app-session-context";
import { Skeleton } from "@/components/ui/skeleton";

import { SettingRow, SettingsCard, SettingsSection } from "./SettingsSection";

export function AccountSettings() {
  const { data: session, status } = useAppSession();

  return (
    <SettingsSection
      title="Profile"
      description="The identity used for your personal Needt workspace."
    >
      <SettingRow
        label="Signed-in account"
        description="Calendar connections are managed separately in Calendars."
      >
        {status === "loading" ? (
          <SettingsCard
            className="flex min-h-[64px] items-center gap-3 px-4"
            aria-label="Loading profile"
          >
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          </SettingsCard>
        ) : (
          <SettingsCard className="flex min-h-[64px] items-center gap-3 px-4">
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt=""
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-control)]">
                <UserRound className="h-4 w-4 text-[var(--text-secondary)]" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium text-[var(--text-primary)]">
                {session?.user?.name || "Planner account"}
              </p>
              <p className="truncate text-[13px] text-[var(--text-secondary)]">
                {session?.user?.email || "Local planner account"}
              </p>
            </div>
          </SettingsCard>
        )}
      </SettingRow>
    </SettingsSection>
  );
}
