"use client";

import Image from "next/image";

import { useAppSession } from "@/components/providers/app-session-context";
import { Skeleton } from "@/components/ui/skeleton";

import { SettingRow, SettingsSection } from "./SettingsSection";

export function AccountSettings() {
  const { data: session, status } = useAppSession();

  return (
    <SettingsSection
      title="Account"
      description="Your signed-in planner profile. Calendar connections are managed in Calendars."
    >
      <SettingRow
        label="Profile"
        description="The account currently signed in to this planner."
      >
        {status === "loading" ? (
          <div className="flex items-center gap-3" aria-label="Loading profile">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt=""
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-[#2B2F31]" />
            )}
            <div>
              <p className="text-sm font-medium text-[#F2F2F2]">
                {session?.user?.name || "Planner account"}
              </p>
              <p className="text-sm text-[#9BA1A6]">
                {session?.user?.email || "Loading account details…"}
              </p>
            </div>
          </div>
        )}
      </SettingRow>
    </SettingsSection>
  );
}
