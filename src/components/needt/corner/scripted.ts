/* THE STAND-IN — everything the corner says until a model says it.
 *
 * No backend is wired here on purpose: the next pass connects the corner to
 * the surface in `src/components/ai/`, and it will do that by handing
 * `<NeedtCorner agent={...} />` something else that satisfies `CornerAgent`.
 * Nothing in the components knows which one it got.
 *
 * What it says is drawn from the fixture rather than invented, so the corner
 * names tasks that exist on the screens beside it. A stand-in that talks
 * about nothing is a stand-in you cannot tell is wrong.
 */
import { NEEDT } from "@/lib/needt/fixture";
import type { NeedtTask } from "@/lib/needt/types";

import type { CornerGlyphName } from "./glyphs";
import type { CornerAgent, CornerMessage, CornerReply } from "./types";
import type { NoticePayload } from "./types";

/** How long the stand-in takes to think. The panel shows dots meanwhile. */
const THINKING_MS = 700;

/** The first task with no time on it — the one a plan would reach for first. */
function firstUnplaced(): NeedtTask | undefined {
  return NEEDT.tasks.find(
    (task) => !task.done && !task.noSlot && task.time === undefined
  );
}

/** The conversation the panel opens on. Two lines: enough to show it is a
 *  place that remembers, not a box you shout into. */
export const SEED_CHAT: readonly CornerMessage[] = Object.freeze([
  {
    id: "seed-1",
    from: "needt",
    text: "Legal sign-off is the only thing blocking the batch. Want me to draft the chase email?",
  },
  {
    id: "seed-2",
    from: "you",
    text: "Yes, short. And find me two hours before Thursday.",
  },
]);

/** The three things the panel offers before you have typed. */
export const CHAT_PROMPTS: readonly { label: string; say: string }[] =
  Object.freeze([
    { label: "Plan my day", say: "plan my day" },
    { label: "Start focus", say: "focus" },
    { label: "What is stuck?", say: "flow" },
  ]);

/** One thing the island is allowed to say. */
export interface IslandNote {
  glyph: CornerGlyphName;
  /** A token reference. */
  tone: string;
  title: string;
  body: string;
  /** The one button, when there is something to do about it. */
  act?: string;
  /** What pressing that button says to the agent. */
  say?: string;
}

/* Each one either teaches something the product can do or reports something
   it just did — never praise, never a count of things that are fine. */
export const ISLAND_NOTES: readonly IslandNote[] = Object.freeze([
  {
    glyph: "wand-sparkles",
    tone: "var(--accent)",
    title: "Two hours opened up",
    body: "The factory call moved. Want the tank graphic in that stretch?",
    act: "Fill it",
    say: "plan my day",
  },
  {
    glyph: "keyboard",
    tone: "var(--text-tertiary)",
    title: "G then C",
    body: "Two-letter jumps move between screens. G H, G C, G W, G D.",
  },
  {
    glyph: "list-plus",
    tone: "var(--success)",
    title: "Break a task into parts",
    body: "Type / while writing one, or add parts after — the counter appears on the block.",
  },
  {
    glyph: "flame",
    tone: "var(--destructive)",
    title: "One task is holding up three",
    body: "Workspace → Flow names what to do first, by how much it frees.",
    act: "Show me",
    say: "flow",
  },
  {
    glyph: "clock",
    tone: "var(--accent)",
    title: "Say it in words",
    body: "“ship the boots tomorrow 3pm for 30 min #resale” — the composer reads all of it.",
  },
  {
    glyph: "moon",
    tone: "var(--text-tertiary)",
    title: "The paper warms after sunset",
    body: "Drift follows the sun where you are. Settings → Appearance.",
  },
]);

/**
 * Notices that read off the fixture, for whoever mounts the corner in a
 * preview. Nothing fires these on its own — a product that greets you with
 * notifications has told you nothing and spent your attention doing it.
 */
export function fixtureNotices(): readonly NoticePayload[] {
  const next = firstUnplaced();
  const blocked = NEEDT.tasks.find((task) => task.blockedBy !== undefined);

  return Object.freeze([
    {
      kind: "placed",
      title: "Two hours held",
      body: next
        ? `${next.title} now has the stretch the factory call left behind.`
        : "The stretch the factory call left behind is held.",
      when: "now",
      acts: [{ label: "Show me", go: "today" }],
    },
    {
      kind: "blocked",
      title: "Still waiting on legal",
      body: blocked
        ? `${blocked.title} cannot close until the sign-off lands.`
        : "One task cannot close until the sign-off lands.",
      when: "4m",
      acts: [
        { label: "What is stuck?", say: "flow" },
        { label: "Open Flow", go: "workspace" },
      ],
    },
  ]);
}

/** How the stand-in answers a line. First match wins, in order. */
const SCRIPT: readonly {
  test: RegExp;
  reply: (task?: NeedtTask) => CornerReply;
}[] = Object.freeze([
  {
    test: /plan|place|schedule/i,
    reply: (task) => ({
      text: task
        ? `Watch — taking ${task.title} into the first free stretch.`
        : "Watch — doing it now.",
      acting: true,
    }),
  },
  {
    test: /focus/i,
    reply: () => ({ text: "Starting a focus session.", acting: true }),
  },
  {
    test: /flow|stuck|block/i,
    reply: (task) => ({
      text: task
        ? `${task.title} frees the most if it closes first.`
        : "Flow names what to do first, by how much it frees.",
      acting: true,
    }),
  },
  {
    test: /capture|add|remind/i,
    reply: () => ({
      text: "Captured — it is on the brief for this week.",
      acting: false,
    }),
  },
]);

/**
 * The scripted agent. Replace it, do not extend it: when a model answers, it
 * satisfies the same two methods and this file stops being mounted.
 */
export function scriptedAgent(): CornerAgent {
  let running = 0;

  return {
    busy: () => running > 0,
    respond(prompt: string) {
      running += 1;
      return new Promise<CornerReply>((resolve) => {
        setTimeout(() => {
          running -= 1;
          const hit = SCRIPT.find((entry) => entry.test.test(prompt));
          resolve(
            hit
              ? hit.reply(firstUnplaced())
              : {
                  text: "Done — it is on the brief for this week.",
                  acting: false,
                }
          );
        }, THINKING_MS);
      });
    },
  };
}
