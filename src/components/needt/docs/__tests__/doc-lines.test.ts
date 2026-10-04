import { docLineWidths } from "../doc-lines";

describe("docLineWidths", () => {
  it("draws exactly as many lines as asked", () => {
    expect(docLineWidths("Launch brief — September", 7)).toHaveLength(7);
    expect(docLineWidths("x", 0)).toHaveLength(0);
  });

  it("is deterministic — the same title always draws the same page", () => {
    const a = docLineWidths("Needt design rules", 9);
    const b = docLineWidths("Needt design rules", 9);
    expect(a).toEqual(b);
  });

  it("draws a different page for a different title", () => {
    const a = docLineWidths("Needt design rules", 6);
    const b = docLineWidths("Invoices and receipts", 6);
    expect(a).not.toEqual(b);
  });

  it("every width is a plausible percentage of the sheet", () => {
    for (const w of docLineWidths("Weekly review, week 35", 6)) {
      expect(w).toBeGreaterThan(0);
      expect(w).toBeLessThanOrEqual(100);
    }
  });

  it("the last line of the run always falls short, like a paragraph's does", () => {
    const widths = docLineWidths("German B2 — verbs to drill", 8);
    const last = widths[widths.length - 1];
    expect(last).toBeLessThan(70);
  });
});
