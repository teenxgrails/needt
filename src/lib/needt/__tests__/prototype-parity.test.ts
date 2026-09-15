/* Parity with the design prototype.
 *
 * `fixture.ts` and `derive.ts` are a hand port of `needt-app/Data.js` from the
 * Claude Design bundle. This runs the prototype's own code and compares, for
 * every task, the numbers the screens will read. A refactor of the derived
 * helpers that changes an answer fails here rather than on screen.
 *
 * The bundle is a downloaded artefact, not a build input, so these tests skip
 * themselves when it is absent instead of failing a checkout that does not have
 * it. Re-download the bundle to run them. */
import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { blocking, blockerOf, streak, unblocks } from "../derive";
import { NEEDT as needtFixture } from "../fixture";

type Proto = {
  tasks: Array<Record<string, unknown>>;
  closedDays: number[];
  unblocks: (t: unknown) => number;
  blockerOf: (t: unknown) => unknown;
  blocking: () => Record<string, number>;
  streak: () => number;
};

const PROTOTYPE = join(
  process.cwd(),
  "Content height and label fixes/needt-app/Data.js",
);

function loadPrototype(): Proto {
  const src = readFileSync(PROTOTYPE, "utf8");
  const sandbox: { NEEDT?: Proto } = {};
  new Function("window", src)(sandbox);
  if (!sandbox.NEEDT) throw new Error("Data.js did not define NEEDT");
  return sandbox.NEEDT;
}

const bundled = existsSync(PROTOTYPE);
const describeIfBundled = bundled ? describe : describe.skip;

describeIfBundled("parity with the prototype's Data.js", () => {
  // Jest runs a skipped describe's body to register its tests, so this must not
  // touch the filesystem when the bundle is absent.
  const proto = bundled ? loadPrototype() : (null as unknown as Proto);

  it("has the same task ids", () => {
    expect(needtFixture.tasks.map((t) => t.id)).toEqual(proto.tasks.map((t) => t.id));
  });

  it("unblocks() agrees on every task", () => {
    const mine = needtFixture.tasks.map((t) => unblocks(t, needtFixture.tasks));
    const theirs = proto.tasks.map((t) => proto.unblocks(t));
    expect(mine).toEqual(theirs);
  });

  it("blockerOf() agrees on every task", () => {
    const shape = (b: unknown) => {
      if (!b) return null;
      const r = b as { kind: string; task?: { id: number }; on?: string; for?: string };
      return r.kind === "task" ? { kind: "task", id: r.task?.id } : { kind: "person", on: r.on, for: r.for };
    };
    const mine = needtFixture.tasks.map((t) => shape(blockerOf(t, needtFixture.tasks)));
    const theirs = proto.tasks.map((t) => shape(proto.blockerOf(t)));
    expect(mine).toEqual(theirs);
  });

  it("blocking() and streak() agree", () => {
    expect(blocking(needtFixture.tasks)).toEqual(proto.blocking());
    expect(streak(needtFixture.closedDays)).toEqual(proto.streak());
  });
});
