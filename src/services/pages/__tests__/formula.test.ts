import { evaluateFormula } from "@/services/pages/formula";

describe("page database formulas", () => {
  it("uses property values and arithmetic precedence", () => {
    expect(evaluateFormula("[Hours] * [Rate] + 5", { Hours: 3, Rate: 20 })).toBe(65);
  });

  it("supports safe string concatenation", () => {
    expect(evaluateFormula("[First] + ' ' + [Last]", { First: "Ada", Last: "Lovelace" })).toBe("Ada Lovelace");
  });

  it("rejects executable JavaScript and oversized formulas", () => {
    expect(() => evaluateFormula("process.exit()", {})).toThrow("Unsupported formula token");
    expect(() => evaluateFormula("1".repeat(501), {})).toThrow("Formula is too long");
  });
});
