/* THE PROMOTION RULE'S OWN TESTS — PORT.md §4: a part's only action is
 * promotion to a task of its own, and that is the ONLY way a second level
 * enters the model. Stated here as input/output pairs so the rule stays true
 * independent of whatever markup calls it. */
import type { NeedtTask } from "@/lib/needt/types";

import { promotePart } from "../part-promote";

const TASK: NeedtTask = {
  id: "1",
  title: "Draft the launch brief",
  project: "Operations",
  done: false,
  parts: [
    { title: "Pull last month's numbers", done: true },
    { title: "Write the draft", done: false },
    { title: "Send it for review", done: false },
  ],
};

describe("promotePart", () => {
  it("turns the part into a task of its own", () => {
    const result = promotePart(TASK, 1, "101");
    expect(result?.promoted).toEqual({
      id: "101",
      title: "Write the draft",
      done: false,
      project: "Operations",
    });
  });

  it("removes only the promoted part, preserving the order of the rest", () => {
    const result = promotePart(TASK, 1, "101");
    expect(result?.task.parts).toEqual([
      { title: "Pull last month's numbers", done: true },
      { title: "Send it for review", done: false },
    ]);
  });

  it("carries the part's done state onto the promoted task", () => {
    const result = promotePart(TASK, 0, "101");
    expect(result?.promoted.done).toBe(true);
  });

  it("inherits the parent's project — it is the same body of work", () => {
    const noProject: NeedtTask = { ...TASK, project: null };
    const result = promotePart(noProject, 0, "101");
    expect(result?.promoted.project).toBeNull();
  });

  it("never gives the promoted task a `parts` array of its own", () => {
    const result = promotePart(TASK, 0, "101");
    expect(result?.promoted.parts).toBeUndefined();
  });

  it("leaves `parts` as `[]`, not `null`, when the last part is promoted", () => {
    const onePart: NeedtTask = {
      ...TASK,
      parts: [{ title: "Only part", done: false }],
    };
    const result = promotePart(onePart, 0, "101");
    expect(result?.task.parts).toEqual([]);
  });

  it("returns null for an index outside the list", () => {
    expect(promotePart(TASK, -1, "101")).toBeNull();
    expect(promotePart(TASK, 3, "101")).toBeNull();
  });

  it("returns null when the task has no parts at all", () => {
    const noParts: NeedtTask = { ...TASK, parts: undefined };
    expect(promotePart(noParts, 0, "101")).toBeNull();
    const nullParts: NeedtTask = { ...TASK, parts: null };
    expect(promotePart(nullParts, 0, "101")).toBeNull();
  });

  it("does not mutate the source task", () => {
    const before = TASK.parts!.length;
    promotePart(TASK, 0, "101");
    expect(TASK.parts).toHaveLength(before);
  });
});
