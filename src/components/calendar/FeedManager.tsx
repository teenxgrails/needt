import { useCallback, useState } from "react";

import { motion, useReducedMotion } from "framer-motion";
import { BsArrowRepeat, BsGoogle, BsMicrosoft, BsTrash } from "react-icons/bs";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";

import { useCalendarStore } from "@/store/calendar";
import { useViewStore } from "@/store/calendar";

import { MiniCalendar } from "./MiniCalendar";

export function FeedManager() {
  const [syncingFeeds, setSyncingFeeds] = useState<Set<string>>(new Set());
  const prefersReducedMotion = useReducedMotion();
  const { feeds, removeFeed, toggleFeed, syncFeed } = useCalendarStore();
  const { date: currentDate, setDate } = useViewStore();

  const handleRemoveFeed = useCallback(
    async (feedId: string) => {
      try {
        await removeFeed(feedId);
      } catch (error) {
        console.error("Failed to remove feed:", error);
      }
    },
    [removeFeed]
  );

  const handleSyncFeed = useCallback(
    async (feedId: string) => {
      if (syncingFeeds.has(feedId)) return;

      try {
        setSyncingFeeds((prev) => new Set(prev).add(feedId));
        await syncFeed(feedId);
      } finally {
        setSyncingFeeds((prev) => {
          const next = new Set(prev);
          next.delete(feedId);
          return next;
        });
      }
    },
    [syncFeed, syncingFeeds]
  );

  return (
    <div className="flex h-full flex-col rounded-md border border-[#323234] bg-[#1B1D1E] p-2 text-white">
      <div className="rounded-md border border-[#323234] bg-[#262627] py-2">
        <MiniCalendar currentDate={currentDate} onDateClick={setDate} />
      </div>
      <div className="mt-2 flex-1 space-y-3 overflow-y-auto rounded-md border border-[#323234] bg-[#262627] p-3">
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-white">Calendars</h3>
          <div className="text-xs text-[#9AA0A6]">My calendars</div>
          {feeds.map((feed, index) => (
            <motion.div
              key={feed.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: prefersReducedMotion ? 0 : index * 0.03,
                duration: prefersReducedMotion ? 0 : 0.16,
              }}
              className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-[#2B2F31]"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={feed.enabled}
                  onCheckedChange={() => toggleFeed(feed.id)}
                  className="h-4 w-4"
                />
                <div
                  className="h-3 w-3 flex-shrink-0 rounded-full"
                  style={{
                    backgroundColor: feed.color || "hsl(var(--primary))",
                  }}
                />
                <span className="calendar-name max-w-[150px] truncate text-sm text-white">
                  {feed.name}
                </span>
                {feed.type === "GOOGLE" && (
                  <BsGoogle
                    className="h-4 w-4 flex-shrink-0 text-[#9AA0A6]"
                    title={feed.url}
                  />
                )}
                {feed.type === "OUTLOOK" && (
                  <BsMicrosoft
                    className="h-4 w-4 flex-shrink-0 text-[#9AA0A6]"
                    title={feed.url}
                  />
                )}
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleSyncFeed(feed.id)}
                      disabled={syncingFeeds.has(feed.id)}
                      className={cn(
                        "rounded-md p-1.5 text-[#9AA0A6] hover:text-white",
                        "hover:bg-[#2B2F31] focus:outline-none focus:ring-2",
                        "focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
                        "disabled:opacity-50"
                      )}
                      aria-label={`Sync ${feed.name}`}
                    >
                      <BsArrowRepeat
                        className={cn(
                          "h-3.5 w-3.5",
                          syncingFeeds.has(feed.id) && "animate-spin"
                        )}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Sync calendar</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleRemoveFeed(feed.id)}
                      className="rounded-md p-1.5 text-[#9AA0A6] hover:bg-[#2B2F31] hover:text-destructive focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                      aria-label={`Remove ${feed.name}`}
                    >
                      <BsTrash className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Remove calendar</TooltipContent>
                </Tooltip>
              </div>
            </motion.div>
          ))}
          {feeds.length === 0 && (
            <p className="py-4 text-center text-sm text-[#9AA0A6]">
              No calendars added yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
