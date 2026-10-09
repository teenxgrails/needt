"use client";

import { useSession } from "next-auth/react";

import { FiChevronsUpDown } from "react-icons/fi";

import { usePlan } from "@/lib/needt3/hooks/plan";
import { useUpdateSettings } from "@/lib/needt3/hooks/settings";
import { THEMES } from "@/lib/needt3/theme";

import { useNeedt3Ui } from "@/store/needt3-ui";

import { RichMenu } from "../menu/RichMenu";

export function AccountMenu() {
  const session = useSession();
  const plan = usePlan();
  const update = useUpdateSettings();
  const openSettings = useNeedt3Ui((state) => state.openSettings);
  const name = session.data?.user?.name || "Account";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
  const label = plan.data
    ? plan.data.kind === "free"
      ? "Free"
      : plan.data.kind === "trial"
        ? "Trial"
        : "Pro"
    : null;
  return (
    <RichMenu
      width={336}
      trigger={
        <button type="button" className="sb-profile" aria-label="Account menu">
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 7,
              background: "var(--surface-raised)",
              boxShadow: "var(--shadow-ring)",
              display: "grid",
              placeItems: "center",
              fontSize: 12,
            }}
          >
            {initials}
          </span>
          <span className="sb-profile-text">
            <span className="sb-profile-name">{name}</span>
            {label && (
              <span
                className={`sb-profile-pill is-${plan.data?.kind === "free" ? "free" : "pro"}`}
              >
                {label}
              </span>
            )}
          </span>
          <span className="sb-profile-chev">
            <FiChevronsUpDown size={14} />
          </span>
        </button>
      }
      items={[
        {
          title: name,
          sub: session.data?.user?.email || undefined,
          disabled: true,
        },
        {
          title: "Plan & billing",
          sub: label ? `${label} plan` : undefined,
          onClick: () => openSettings("plan"),
        },
        { sep: true },
        { title: "Settings", kbd: "⌘,", onClick: () => openSettings() },
        ...THEMES.map(([value, title]) => ({
          title,
          sub: "Appearance",
          disabled: update.isPending,
          onClick: () => {
            void update
              .mutateAsync({ theme: value })
              .then(() => useNeedt3Ui.getState().setTheme(value))
              .catch(() => {});
          },
        })),
      ]}
    />
  );
}
