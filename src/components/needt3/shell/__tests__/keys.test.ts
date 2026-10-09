import { SHELL_SHORTCUTS, shortcutForSequence } from "../keys";

describe("v3 shell shortcuts", () => {
  it("uses the displayed Go to table as the handler registry", () => {
    for (const row of SHELL_SHORTCUTS.filter((shortcut) => shortcut.sequence)) {
      expect(shortcutForSequence(row.keys.join(""))).toBe(row);
      expect(row.href || row.action).toBeTruthy();
    }
  });

  it("routes G T and G P to distinct Tasks and Projects places", () => {
    expect(shortcutForSequence("gt")?.href).toBe("/tasks");
    expect(shortcutForSequence("gp")?.href).toBe("/projects");
    expect(shortcutForSequence("gw")).toBeUndefined();
  });

  it("recognizes command K on macOS and control K elsewhere without stealing shifted combinations", () => {
    const shortcut = SHELL_SHORTCUTS.find((row) => row.action === "palette")!;
    const event = {
      key: "k",
      metaKey: true,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
    };
    expect(shortcut.match?.(event)).toBe(true);
    expect(shortcut.match?.({ ...event, metaKey: false, ctrlKey: true })).toBe(
      true
    );
    expect(shortcut.match?.({ ...event, shiftKey: true })).toBe(false);
  });
});
