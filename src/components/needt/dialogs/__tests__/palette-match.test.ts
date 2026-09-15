/* THE PALETTE'S OWN TESTS — matching and ranking, judged the same way
 * `co-parse.test.ts` judges the composer's parser: state the input and the
 * verdict, because a search box is judged by what it returns, not by eye. */
import { paletteMatch, paletteScore } from "../palette-match";

describe("paletteScore", () => {
  it("matches everything, at the same score, when the query is empty", () => {
    expect(paletteScore("Draft the launch brief", "")).toBe(0);
    expect(paletteScore("Draft the launch brief", "   ")).toBe(0);
  });

  it("scores an exact match above a prefix, and a prefix above a substring", () => {
    const exact = paletteScore("today", "today");
    const prefix = paletteScore("today's brief", "today");
    const middle = paletteScore("open today", "today");
    expect(exact).not.toBeNull();
    expect(prefix).not.toBeNull();
    expect(middle).not.toBeNull();
    expect(exact!).toBeGreaterThan(prefix!);
    expect(prefix!).toBeGreaterThan(middle!);
  });

  it("is case-insensitive", () => {
    expect(paletteScore("Draft the launch brief", "LAUNCH")).toBe(1);
    expect(paletteScore("Draft the launch brief", "DRAFT")).toBe(2);
  });

  it("returns null when the query does not occur at all", () => {
    expect(paletteScore("Draft the launch brief", "workspace")).toBeNull();
  });
});

describe("paletteMatch", () => {
  const rows = [
    "Send invoices for August",
    "Draft the launch brief",
    "Review the form-row spec",
    "German — B2 unit 4",
  ];

  it("finds a match anywhere in the title, not only at the start", () => {
    const ranked = paletteMatch(rows, "brief", (r) => r);
    expect(ranked).toEqual(["Draft the launch brief"]);
  });

  it("ranks a prefix match above a mid-string match", () => {
    const withPrefix = ["Review the spec", "A review is overdue"];
    /* Both rows contain "review"; only the first STARTS with it. */
    const ranked = paletteMatch(withPrefix, "review", (r) => r);
    expect(ranked).toEqual(["Review the spec", "A review is overdue"]);
  });

  it("keeps the source order for equally-ranked hits", () => {
    const ranked = paletteMatch(rows, "e", (r) => r);
    /* Every row contains "e"; none starts with it, so all four tie at the
       same score and must come back in their original order. */
    expect(ranked).toEqual(rows);
  });

  it("excludes anything that does not match", () => {
    const ranked = paletteMatch(rows, "german", (r) => r);
    expect(ranked).toEqual(["German — B2 unit 4"]);
  });

  it("returns everything, unranked by relevance, when the query is empty", () => {
    expect(paletteMatch(rows, "", (r) => r)).toEqual(rows);
  });

  it("caps the result at `limit`, keeping the best-ranked rows", () => {
    const ranked = paletteMatch(rows, "e", (r) => r, 2);
    expect(ranked).toEqual(rows.slice(0, 2));
  });

  it("works over objects via the `label` reader, not just strings", () => {
    const tasks = [
      { id: 1, title: "Draft the launch brief" },
      { id: 2, title: "Send invoices for August" },
    ];
    const ranked = paletteMatch(tasks, "draft", (t) => t.title);
    expect(ranked).toEqual([tasks[0]]);
  });
});
