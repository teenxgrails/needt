/* The keyboard table, tested without a DOM.
 *
 * The point of these is the claim PORT.md §5 makes: one table drives both the
 * handler and the printed sheet. So the tests are mostly about the two never
 * being able to drift — every printed row parses into exactly one binding, and
 * the binding is read from the same caps the sheet prints.
 */
import {
  NEEDT_KEYS,
  NEEDT_KEY_ROWS,
  NEEDT_SEQUENCE_LEADS,
  type NeedtKeyEvent,
  chordOf,
  matchNeedtKey,
  matchNeedtSequence,
  sequenceOf,
} from "../keys";

const press = (over: Partial<NeedtKeyEvent>): NeedtKeyEvent => ({
  key: "a",
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...over,
});

describe("one table, two readers", () => {
  it("prints every bound row", () => {
    /* Nothing fires that the sheet does not show, because the sheet renders
       NEEDT_KEYS and the matcher walks the same rows. */
    const printed = NEEDT_KEYS.flatMap((group) => group.keys);
    expect(printed).toEqual([...NEEDT_KEY_ROWS]);
  });

  it("reads every row's caps as either one chord or one sequence", () => {
    for (const row of NEEDT_KEY_ROWS) {
      const readings = [chordOf(row), sequenceOf(row)].filter(Boolean);
      expect(readings).toHaveLength(1);
    }
  });

  it("never prints the same label twice", () => {
    const labels = NEEDT_KEY_ROWS.map((row) => row.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("binds no two rows to the same chord", () => {
    const seen = NEEDT_KEY_ROWS.filter((row) => row.action)
      .map(chordOf)
      .filter((chord) => chord !== null)
      .map((chord) => `${chord.meta}:${chord.shift}:${chord.alt}:${chord.key}`);
    expect(new Set(seen).size).toBe(seen.length);
  });
});

describe("matching a chord", () => {
  it("opens the palette on ⌘K", () => {
    expect(matchNeedtKey(press({ key: "k", metaKey: true }))?.action).toEqual({
      kind: "palette",
    });
  });

  it("treats Ctrl as ⌘, because the table prints one cap", () => {
    expect(matchNeedtKey(press({ key: "k", ctrlKey: true }))?.action).toEqual({
      kind: "palette",
    });
  });

  it("keeps ⌘⇧F and ⌘K apart on the shift", () => {
    expect(
      matchNeedtKey(press({ key: "f", metaKey: true, shiftKey: true }))?.action
    ).toEqual({ kind: "focus" });
    /* ⌘F with no shift is the browser's find, and no row claims it. */
    expect(matchNeedtKey(press({ key: "f", metaKey: true }))).toBeNull();
  });

  it("does not read a bare letter as its modified row", () => {
    expect(matchNeedtKey(press({ key: "k" }))).toBeNull();
  });

  it("opens the sheet on ?, whatever the shift state that produced it", () => {
    expect(matchNeedtKey(press({ key: "?", shiftKey: true }))?.action).toEqual({
      kind: "sheet",
    });
  });

  it("refuses a row that is only printed", () => {
    /* ⌘⏎ closes a task, and the shell has no task in hand. */
    expect(matchNeedtKey(press({ key: "Enter", metaKey: true }))).toBeNull();
  });

  it("ignores Alt, which no row asks for", () => {
    expect(
      matchNeedtKey(press({ key: "k", metaKey: true, altKey: true }))
    ).toBeNull();
  });
});

describe("inside a field", () => {
  it("stands the bare rows down", () => {
    expect(matchNeedtKey(press({ key: "?" }), { typing: true })).toBeNull();
  });

  it("keeps the modified rows", () => {
    expect(
      matchNeedtKey(press({ key: "k", metaKey: true }), { typing: true })
        ?.action
    ).toEqual({ kind: "palette" });
  });

  it("always keeps Escape", () => {
    expect(
      matchNeedtKey(press({ key: "Escape" }), { typing: true })?.action
    ).toEqual({ kind: "close" });
  });
});

describe("G, then a letter", () => {
  it("reads its lead off the table rather than a second list", () => {
    expect([...NEEDT_SEQUENCE_LEADS]).toEqual(["g"]);
  });

  it.each([
    ["h", "today"],
    ["c", "calendar"],
    ["w", "workspace"],
    ["d", "docs"],
    ["s", "settings"],
  ])("g then %s goes to %s", (letter, screen) => {
    expect(matchNeedtSequence("g", letter)?.action).toEqual({
      kind: "go",
      screen,
    });
  });

  it("is case-insensitive, because the caps are printed upper", () => {
    expect(matchNeedtSequence("G", "H")?.action).toEqual({
      kind: "go",
      screen: "today",
    });
  });

  it("answers nothing for a letter no row claims", () => {
    expect(matchNeedtSequence("g", "q")).toBeNull();
  });
});
