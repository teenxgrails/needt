"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { motion, useReducedMotion } from "motion/react";
import { HiOutlineSearch, HiX } from "react-icons/hi";
import {
  HiOutlineCalendar,
  HiOutlineClipboardList,
  HiOutlineCog,
  HiOutlineCollection,
  HiOutlineLightningBolt,
} from "react-icons/hi";

import { fuzzyMatch } from "@/lib/fuzzy-match";
import { quickEase, springSnappy } from "@/lib/motion";
import { cn, formatShortcut } from "@/lib/utils";

import { useCommands } from "@/hooks/useCommands";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function FuzzyHighlight({ text, query }: { text: string; query: string }) {
  const matchedIndexes = new Set(fuzzyMatch(text, query)?.indexes ?? []);

  return (
    <>
      {Array.from(text).map((character, index) =>
        matchedIndexes.has(index) ? (
          <mark
            key={`${character}-${index}`}
            className="bg-transparent font-semibold text-white"
          >
            {character}
          </mark>
        ) : (
          character
        )
      )}
    </>
  );
}

function AnimatedItem({
  children,
  index,
}: {
  children: ReactNode;
  index: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={
        prefersReducedMotion ? false : { opacity: 0, y: 4, scale: 0.995 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : {
              duration: 0.16,
              delay: Math.min(index, 6) * 0.018,
              ease: "easeOut",
            }
      }
    >
      {children}
    </motion.div>
  );
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [search, setSearch] = useState("");
  const [showAllCommands, setShowAllCommands] = useState(false);
  const [results, setResults] = useState<
    Array<{ id: string; type: string; title: string; href: string }>
  >([]);
  const { searchCommands, executeCommand, getAllCommands } = useCommands();

  // Get filtered commands based on search or show all commands
  const commands = useMemo(() => {
    if (showAllCommands) {
      return getAllCommands();
    }
    return search ? searchCommands(search) : [];
  }, [search, searchCommands, showAllCommands, getAllCommands]);

  // Reset search and showAllCommands when opening/closing
  useEffect(() => {
    if (!open) {
      setSearch("");
      setShowAllCommands(false);
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(search)}`, {
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : { results: [] }))
        .then((data) => setResults(data.results || []))
        .catch(() => undefined);
    }, 140);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [search]);

  // Group commands by section for better organization
  const groupedCommands = useMemo(() => {
    const groups: Record<string, typeof commands> = {};

    commands.forEach((command) => {
      if (!groups[command.section]) {
        groups[command.section] = [];
      }
      groups[command.section].push(command);
    });

    return groups;
  }, [commands]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal forceMount>
        <Dialog.Overlay forceMount asChild>
          <motion.div
            initial={false}
            animate={{ opacity: open ? 1 : 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : quickEase}
            className="fixed inset-0 z-50 bg-black/55 data-[state=closed]:pointer-events-none"
            style={{ pointerEvents: open ? "auto" : "none" }}
          />
        </Dialog.Overlay>
        <Dialog.Content
          forceMount
          className="fixed left-1/2 top-[20%] z-50 w-full max-w-[640px] -translate-x-1/2 data-[state=closed]:pointer-events-none"
          style={{ pointerEvents: open ? "auto" : "none" }}
        >
          <Dialog.Title className="sr-only">Command Menu</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search commands and navigate the application
          </Dialog.Description>

          <motion.div
            initial={false}
            animate={
              open
                ? { opacity: 1, scale: 1, y: 0 }
                : { opacity: 0, scale: 0.98, y: -4 }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : open
                  ? springSnappy
                  : quickEase
            }
          >
          <Command
            shouldFilter={false}
            className={cn(
              "overflow-hidden rounded-lg border border-[var(--line-strong)] bg-[var(--raised)] text-[var(--text-hi)] shadow-lg"
            )}
          >
            <div className="flex items-center border-b border-[var(--line-strong)] px-3">
              <HiOutlineSearch className="h-5 w-5 text-[var(--text-lo)]" />
              <Command.Input
                placeholder="Type a command or search..."
                className="h-12 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-[var(--text-lo)]"
                value={search}
                onValueChange={setSearch}
              />
              {search && (
                <button
                  className="text-[var(--text-lo)] hover:text-[var(--text-hi)]"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <HiX className="h-5 w-5" />
                </button>
              )}
              {!search && (
                <kbd className="hidden items-center gap-1 rounded bg-[var(--app-bg)] px-2 py-0.5 text-xs text-[var(--text-lo)] sm:flex">
                  <span className="text-xs">⌘</span>
                  <span>K</span>
                </kbd>
              )}
              <Dialog.Close
                className="ml-2 p-2 text-[var(--text-lo)] hover:text-[var(--text-hi)]"
                aria-label="Close command menu"
              >
                <HiX className="h-5 w-5" />
              </Dialog.Close>
            </div>

            <Command.List className="max-h-[300px] overflow-y-auto p-2">
              {!search && !showAllCommands && (
                <div className="px-2 py-3 text-sm text-[var(--text-lo)]">
                  <p className="mb-2">
                    Start typing to search commands or try these:
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div
                      className="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-[var(--active)]"
                      onClick={() => {
                        executeCommand("navigation.calendar");
                        onOpenChange(false);
                      }}
                    >
                      <HiOutlineCalendar className="h-4 w-4 text-[var(--text-lo)]" />
                      <span className="text-sm">Go to Calendar</span>
                      <kbd className="ml-auto rounded bg-[var(--app-bg)] px-1.5 py-0.5 text-xs">
                        gc
                      </kbd>
                    </div>
                    <div
                      className="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-[var(--active)]"
                      onClick={() => {
                        executeCommand("navigation.tasks");
                        onOpenChange(false);
                      }}
                    >
                      <HiOutlineClipboardList className="h-4 w-4 text-[var(--text-lo)]" />
                      <span className="text-sm">Go to Tasks</span>
                      <kbd className="ml-auto rounded bg-[var(--app-bg)] px-1.5 py-0.5 text-xs">
                        gt
                      </kbd>
                    </div>
                    <div
                      className="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-[var(--active)]"
                      onClick={() => {
                        executeCommand("navigation.focus");
                        onOpenChange(false);
                      }}
                    >
                      <HiOutlineLightningBolt className="h-4 w-4 text-[var(--text-lo)]" />
                      <span className="text-sm">Go to Focus</span>
                      <kbd className="ml-auto rounded bg-[var(--app-bg)] px-1.5 py-0.5 text-xs">
                        gf
                      </kbd>
                    </div>
                    <div
                      className="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-[var(--active)]"
                      onClick={() => {
                        executeCommand("navigation.settings");
                        onOpenChange(false);
                      }}
                    >
                      <HiOutlineCog className="h-4 w-4 text-[var(--text-lo)]" />
                      <span className="text-sm">Go to Settings</span>
                      <kbd className="ml-auto rounded bg-[var(--app-bg)] px-1.5 py-0.5 text-xs">
                        gs
                      </kbd>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => setShowAllCommands(true)}
                      className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--active)]"
                    >
                      <HiOutlineCollection className="h-4 w-4" />
                      Show all commands
                    </button>
                  </div>
                </div>
              )}

              <Command.Empty className="py-6 text-center text-sm text-[var(--text-lo)]">
                No results found. Try a different search term.
              </Command.Empty>

              {(commands.length > 0 || showAllCommands) &&
                Object.entries(groupedCommands).map(
                  ([section, sectionCommands]) => (
                    <Command.Group
                      key={section}
                      heading={
                        section.charAt(0).toUpperCase() + section.slice(1)
                      }
                    >
                      {sectionCommands.map((command, commandIndex) => {
                        const Icon = command.icon;
                        return (
                          <AnimatedItem key={command.id} index={commandIndex}>
                            <Command.Item
                              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-[var(--active)] aria-selected:text-[var(--text-hi)]"
                              onSelect={() => {
                                executeCommand(command.id);
                                onOpenChange(false);
                              }}
                            >
                              {Icon && <Icon className="h-4 w-4" />}
                              <span>
                                <FuzzyHighlight
                                  text={command.title}
                                  query={search}
                                />
                              </span>
                              {command.shortcut && (
                                <kbd className="ml-auto text-xs text-[var(--text-lo)]">
                                  {formatShortcut(command.shortcut)}
                                </kbd>
                              )}
                            </Command.Item>
                          </AnimatedItem>
                        );
                      })}
                    </Command.Group>
                  )
                )}
              {results.length > 0 && (
                <Command.Group heading="Search">
                  {results.map((result, resultIndex) => (
                    <AnimatedItem
                      key={`${result.type}-${result.id}`}
                      index={resultIndex}
                    >
                      <Command.Item
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-[#2B2F31] aria-selected:text-white"
                        onSelect={() => {
                          router.push(result.href);
                          onOpenChange(false);
                        }}
                      >
                        <span className="w-14 text-xs text-[#9AA0A6]">
                          {result.type}
                        </span>
                        <span>
                          <FuzzyHighlight text={result.title} query={search} />
                        </span>
                      </Command.Item>
                    </AnimatedItem>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          </Command>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
