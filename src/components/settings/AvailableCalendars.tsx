import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { logger } from "@/lib/logger";

import { extractCalendarFetchFailure } from "./available-calendars-error";

const LOG_SOURCE = "AvailableCalendars";

interface AvailableCalendar {
  id: string;
  name: string;
  color: string;
  accessRole?: string;
  canEdit?: boolean;
  alreadyAdded?: boolean;
}

interface Props {
  accountId: string;
  provider: "GOOGLE" | "OUTLOOK" | "CALDAV";
}

export function AvailableCalendars({ accountId, provider }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [calendars, setCalendars] = useState<AvailableCalendar[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [addingCalendars, setAddingCalendars] = useState<Set<string>>(
    new Set()
  );

  const loadAvailableCalendars = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setErrorCode(null);
      let endpoint;

      switch (provider) {
        case "GOOGLE":
          endpoint = `/api/calendar/google/available?accountId=${accountId}`;
          break;
        case "OUTLOOK":
          endpoint = `/api/calendar/outlook/available?accountId=${accountId}`;
          break;
        case "CALDAV":
          endpoint = `/api/calendar/caldav/available?accountId=${accountId}`;
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      const response = await fetch(endpoint);
      if (!response.ok) {
        // Surface the server's classified error (e.g. the CalDAV
        // connection-vs-auth message) instead of a generic empty state.
        const failure = await extractCalendarFetchFailure(response);
        setErrorMessage(failure.message);
        setErrorCode(failure.code ?? null);
        setCalendars([]);
        return;
      }
      const data = await response.json();
      setCalendars(data);
    } catch (error) {
      logger.error(
        "Failed to load available calendars",
        { error: error instanceof Error ? error.message : "Unknown error" },
        LOG_SOURCE
      );
      setErrorMessage("Failed to load available calendars");
      setErrorCode(null);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, provider]);

  // Load calendars when component mounts
  useEffect(() => {
    loadAvailableCalendars();
  }, [loadAvailableCalendars]);

  const handleAddCalendar = useCallback(
    async (calendar: AvailableCalendar) => {
      try {
        setAddingCalendars((prev) => new Set(prev).add(calendar.id));
        setErrorMessage(null);
        setErrorCode(null);
        let endpoint;

        switch (provider) {
          case "GOOGLE":
            endpoint = "/api/calendar/google";
            break;
          case "OUTLOOK":
            endpoint = "/api/calendar/outlook/sync";
            break;
          case "CALDAV":
            endpoint = "/api/calendar/caldav";
            break;
          default:
            throw new Error(`Unsupported provider: ${provider}`);
        }

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountId,
            calendarId: calendar.id,
            name: calendar.name,
            color: calendar.color,
          }),
        });

        if (!response.ok) {
          // Surface the server's classified error (e.g. the CalDAV
          // connection-vs-auth message) so a failed add is not silent.
          const failure = await extractCalendarFetchFailure(
            response,
            "Failed to add calendar"
          );
          setErrorMessage(failure.message);
          setErrorCode(failure.code ?? null);
          return;
        }

        // Remove from available list
        setCalendars((prev) =>
          prev.filter((c) => {
            if (calendar.alreadyAdded) {
              return false;
            }
            if (c.id === calendar.id) {
              return false;
            }
            return true;
          })
        );
      } catch (error) {
        logger.error(
          "Failed to add calendar",
          {
            accountId,
            calendarId: calendar.id,
            error: error instanceof Error ? error.message : "Unknown error",
          },
          LOG_SOURCE
        );
      setErrorMessage("Failed to add calendar");
      setErrorCode(null);
      } finally {
        setAddingCalendars((prev) => {
          const next = new Set(prev);
          next.delete(calendar.id);
          return next;
        });
      }
    },
    [accountId, provider]
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-[var(--control-radius)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (errorMessage) {
    const reconnectRequired =
      errorCode === "CALENDAR_REAUTHORIZATION_REQUIRED" &&
      provider !== "CALDAV";
    return (
      <div className="space-y-3">
        <div className="rounded-[var(--control-radius)] border border-[var(--border-control)] bg-[var(--surface-raised)] p-3 text-[13px] text-[var(--text-secondary)]">
          {errorMessage}
        </div>
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (reconnectRequired) {
                window.location.href =
                  provider === "GOOGLE"
                    ? "/api/calendar/google/auth"
                    : "/api/calendar/outlook/auth";
                return;
              }
              void loadAvailableCalendars();
            }}
            disabled={isLoading}
          >
            {reconnectRequired
              ? `Reconnect ${provider === "GOOGLE" ? "Google" : "Outlook"}`
              : "Retry"}
          </Button>
        </div>
      </div>
    );
  }

  if (calendars.length === 0) {
    return (
      <div className="py-8 text-center text-[13px] text-[var(--text-secondary)]">
        No available calendars found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden border border-[var(--border-subtle)]">
        {calendars.map((calendar) => (
          <div
            key={calendar.id}
            className="flex min-h-[52px] items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 first:border-t-0"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: calendar.color }}
              />
              <span className="text-[14px]">{calendar.name}</span>
              <Badge variant="outline" className="capitalize">
                {calendar.accessRole?.toLowerCase() ||
                  (calendar.canEdit ? "owner" : "reader")}
              </Badge>
            </div>
            <Button
              size="sm"
              onClick={() => handleAddCalendar(calendar)}
              disabled={addingCalendars.has(calendar.id)}
            >
              {addingCalendars.has(calendar.id) ? "Adding..." : "Add"}
            </Button>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={loadAvailableCalendars}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </div>
    </div>
  );
}
