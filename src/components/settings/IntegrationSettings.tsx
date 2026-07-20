"use client";

import { type ReactNode, forwardRef, useRef } from "react";

import {
  CheckCircle2,
  CheckSquare2,
  Circle,
  CircleMinus,
  Code2,
  Mail,
  Webhook,
} from "lucide-react";
import { FaApple, FaMicrosoft } from "react-icons/fa";
import { SiGooglecalendar } from "react-icons/si";
import { toast } from "sonner";

import { AnimatedBeam } from "@/components/ui/animated-beam";
import { Button } from "@/components/ui/button";

import { APP_NAME } from "@/lib/app-config";
import { cn } from "@/lib/utils";

import { useSettingsStore } from "@/store/settings";

interface IntegrationCard {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  action: string;
  onClick: () => void;
  status: "Connected" | "Not configured" | "Unavailable";
  disabled?: boolean;
}

export function IntegrationSettings() {
  const { accounts } = useSettingsStore();
  const hasGoogle = accounts.some((account) => account.provider === "GOOGLE");
  const hasOutlook = accounts.some((account) => account.provider === "OUTLOOK");
  const hasApple = accounts.some((account) => account.provider === "CALDAV");

  const goTo = (hash: string) => {
    window.location.hash = hash;
  };

  const integrations: IntegrationCard[] = [
    {
      id: "google-calendar",
      name: "Google Calendar",
      description: "Sync events and scheduled task blocks.",
      icon: <SiGooglecalendar className="h-8 w-8" />,
      action: hasGoogle ? "Manage" : "Connect",
      status: hasGoogle ? "Connected" : "Not configured",
      onClick: () => goTo("calendars"),
    },
    {
      id: "outlook-calendar",
      name: "Outlook Calendar",
      description: "Keep Microsoft calendars in sync with Needt.",
      icon: <FaMicrosoft className="h-8 w-8 text-[#6CA9FF]" />,
      action: hasOutlook ? "Manage" : "Connect",
      status: hasOutlook ? "Connected" : "Not configured",
      onClick: () => goTo("calendars"),
    },
    {
      id: "icloud-calendar",
      name: "iCloud Calendar",
      description: "Connect Apple Calendar with an app-specific password.",
      icon: <FaApple className="h-8 w-8 text-[var(--text-secondary)]" />,
      action: hasApple ? "Manage" : "Connect",
      status: hasApple ? "Connected" : "Not configured",
      onClick: () => goTo("calendars"),
    },
    {
      id: "task-providers",
      name: "External Tasks",
      description: "Import Google Tasks, Microsoft To Do, and CalDAV tasks.",
      icon: <CheckSquare2 className="h-8 w-8 text-[var(--text-secondary)]" />,
      action: "Configure",
      status: "Not configured",
      onClick: () =>
        toast.info(
          "Connect a calendar account first, then choose its task lists"
        ),
    },
    {
      id: "zapier",
      name: "Zapier",
      description: "Connect Needt with thousands of other apps.",
      icon: (
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#FF4F00] text-sm font-bold text-white">
          zap
        </span>
      ),
      action: "Coming soon",
      status: "Unavailable",
      disabled: true,
      onClick: () => undefined,
    },
    {
      id: "email",
      name: "Email",
      description: "Turn an email into a task in your Needt inbox.",
      icon: <Mail className="h-8 w-8 text-[var(--text-secondary)]" />,
      action: "Unavailable",
      status: "Unavailable",
      disabled: true,
      onClick: () => undefined,
    },
    {
      id: "api",
      name: "Needt API",
      description: "Create tasks and read your schedule from local tools.",
      icon: <Code2 className="h-8 w-8 text-[var(--text-secondary)]" />,
      action: "Configure",
      status: "Not configured",
      onClick: () => goTo("api"),
    },
    {
      id: "webhooks",
      name: "Webhooks",
      description: "Notify automations when schedules or tasks change.",
      icon: <Webhook className="h-8 w-8 text-[var(--text-secondary)]" />,
      action: "Configure",
      status: "Not configured",
      onClick: () => goTo("api"),
    },
  ];

  return (
    <div className="max-w-[1100px] space-y-4">
      <IntegrationBeamMap
        hasGoogle={hasGoogle}
        hasOutlook={hasOutlook}
        hasApple={hasApple}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((integration) => (
          <article
            key={integration.id}
            className="flex min-h-[180px] flex-col rounded-[var(--control-radius)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              {integration.icon}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-control)] px-2 py-0.5 text-[11px]",
                  integration.status === "Connected"
                    ? "text-[var(--color-success)]"
                    : "text-[var(--text-muted)]"
                )}
              >
                {integration.status === "Connected" ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : integration.status === "Unavailable" ? (
                  <CircleMinus className="h-3 w-3" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
                {integration.status}
              </span>
            </div>
            <h2 className="mt-4 text-[15px] font-semibold">
              {integration.name}
            </h2>
            <p className="mt-1 flex-1 text-[13px] leading-5 text-[var(--text-secondary)]">
              {integration.description}
            </p>
            <Button
              variant="outline"
              onClick={integration.onClick}
              disabled={integration.disabled}
              className="mt-4 w-full"
            >
              {integration.action}
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}

function IntegrationBeamMap({
  hasGoogle,
  hasOutlook,
  hasApple,
}: {
  hasGoogle: boolean;
  hasOutlook: boolean;
  hasApple: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const needtRef = useRef<HTMLDivElement>(null);
  const googleRef = useRef<HTMLDivElement>(null);
  const outlookRef = useRef<HTMLDivElement>(null);
  const appleRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<HTMLDivElement>(null);

  const beamProps = {
    containerRef,
    toRef: needtRef,
    pathColor: "var(--border-control)",
    gradientStartColor: "var(--text-muted)",
    pathWidth: 1.5,
    pathOpacity: 0.55,
    duration: 4,
  };

  return (
    <section
      aria-label="Integration connections"
      className="overflow-hidden rounded-[var(--control-radius)] border border-[var(--border-subtle)]"
    >
      <div
        ref={containerRef}
        className="needt-page-depth relative h-[250px] sm:h-[280px]"
      >
        <IntegrationNode
          ref={googleRef}
          label="Google"
          className="left-5 top-6 sm:left-12 sm:top-8"
        >
          <SiGooglecalendar className="h-5 w-5" />
        </IntegrationNode>
        <IntegrationNode
          ref={outlookRef}
          label="Outlook"
          className="right-5 top-6 sm:right-12 sm:top-8"
        >
          <FaMicrosoft className="h-5 w-5" />
        </IntegrationNode>
        <IntegrationNode
          ref={appleRef}
          label="iCloud"
          className="bottom-6 left-5 sm:bottom-8 sm:left-12"
        >
          <FaApple className="h-5 w-5" />
        </IntegrationNode>
        <IntegrationNode
          ref={apiRef}
          label="API"
          className="bottom-6 right-5 sm:bottom-8 sm:right-12"
        >
          <Code2 className="h-5 w-5" />
        </IntegrationNode>

        <div
          ref={needtRef}
          className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-[var(--border-control)] bg-[var(--surface-control)] text-sm font-semibold text-[var(--text-primary)] sm:h-20 sm:w-20"
        >
          {APP_NAME}
        </div>

        <AnimatedBeam
          {...beamProps}
          fromRef={googleRef}
          curvature={-34}
          gradientStopColor={
            hasGoogle ? "var(--color-success)" : "var(--color-accent)"
          }
        />
        <AnimatedBeam
          {...beamProps}
          fromRef={outlookRef}
          curvature={-34}
          reverse
          gradientStopColor={
            hasOutlook ? "var(--color-success)" : "var(--color-accent)"
          }
        />
        <AnimatedBeam
          {...beamProps}
          fromRef={appleRef}
          curvature={34}
          gradientStopColor={
            hasApple ? "var(--color-success)" : "var(--color-accent)"
          }
        />
        <AnimatedBeam
          {...beamProps}
          fromRef={apiRef}
          curvature={34}
          reverse
          gradientStopColor="var(--color-accent)"
        />
      </div>
      <p className="border-t border-[var(--border-subtle)] px-4 py-3 text-[12px] text-[var(--text-muted)]">
        Connected tools flow into one schedule. Green beams indicate active
        calendar connections.
      </p>
    </section>
  );
}

const IntegrationNode = forwardRef<
  HTMLDivElement,
  {
    label: string;
    className: string;
    children: ReactNode;
  }
>(({ label, className, children }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute z-10 flex h-12 min-w-[88px] items-center justify-center gap-2 rounded-xl border border-[var(--border-control)] bg-[var(--surface-canvas)] px-3 text-[12px] font-medium text-[var(--text-secondary)] sm:h-14 sm:min-w-[104px]",
      className
    )}
  >
    {children}
    <span>{label}</span>
  </div>
));

IntegrationNode.displayName = "IntegrationNode";
