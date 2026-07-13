import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { fuzzyScore } from "@/lib/fuzzy-match";
import { logger } from "@/lib/logger";

import { Command, CommandRegistry } from "./types";

const LOG_SOURCE = "CommandRegistry";

class CommandRegistryImpl {
  private commands: CommandRegistry = new Map();

  register(command: Command) {
    if (!command.id) {
      void logger.error(
        "Attempted to register command without ID",
        { title: command.title },
        LOG_SOURCE
      );
      return;
    }
    this.commands.set(command.id, command);
  }

  unregister(commandId: string) {
    if (!commandId) {
      void logger.error(
        "Attempted to unregister command without ID",
        undefined,
        LOG_SOURCE
      );
      return;
    }
    this.commands.delete(commandId);
  }

  getAll(): Command[] {
    const commands = Array.from(this.commands.values());
    return commands;
  }

  getBySection(section: Command["section"]): Command[] {
    return this.getAll().filter((command) => command.section === section);
  }

  search(query: string): Command[] {
    const terms = query.trim().split(/\s+/).filter(Boolean);
    return this.getAll()
      .map((command) => {
        const fields = [command.title, ...command.keywords];
        const scores = terms.map((term) => {
          const matches = fields
            .map((field) => fuzzyScore(field, term))
            .filter((score): score is number => score !== null);
          return matches.length > 0 ? Math.min(...matches) : null;
        });

        if (scores.some((score) => score === null)) return null;
        return {
          command,
          score: scores.reduce<number>((total, score) => total + (score ?? 0), 0),
        };
      })
      .filter(
        (
          result
        ): result is {
          command: Command;
          score: number;
        } => result !== null
      )
      .sort((a, b) => a.score - b.score || a.command.title.localeCompare(b.command.title))
      .map(({ command }) => command);
  }

  async execute(commandId: string, router?: AppRouterInstance) {
    const command = this.commands.get(commandId);
    if (!command) {
      void logger.error(
        "Command not found",
        { commandId },
        LOG_SOURCE
      );
      throw new Error(`Command ${commandId} not found`);
    }

    // Check if the command has a required path
    if (command.context?.requiredPath && typeof window !== "undefined") {
      const currentPath = window.location.pathname;

      // If we're not on the required path
      if (currentPath !== command.context.requiredPath) {
        // If navigateIfNeeded is true and we have a router, navigate
        if (command.context.navigateIfNeeded && router) {
          await router.push(command.context.requiredPath);
          // Wait for navigation
          await new Promise((resolve) => setTimeout(resolve, 100));
        } else if (command.context.navigateIfNeeded && !router) {
          void logger.error(
            "Command needs navigation but no router was provided",
            { commandId },
            LOG_SOURCE
          );
          return; // Don't execute the command if we can't navigate
        } else {
          // If navigateIfNeeded is false, log a warning
          logger.warn(
            "Command path requirement was not met",
            { commandId, currentPath },
            LOG_SOURCE
          );
        }
      }
    }

    try {
      return await command.perform(router);
    } catch (error) {
      void logger.error(
        "Command execution failed",
        {
          commandId,
          error: error instanceof Error ? error.message : String(error),
        },
        LOG_SOURCE
      );
      throw error;
    }
  }
}

export const commandRegistry = new CommandRegistryImpl();
