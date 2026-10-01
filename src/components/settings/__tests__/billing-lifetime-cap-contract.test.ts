import { readFileSync } from "node:fs";

describe("Lifetime checkout UI contract", () => {
  const source = readFileSync(
    "src/components/settings/BillingSettings.tsx",
    "utf8"
  );

  it("shows only the closed state and never a remaining-spots count", () => {
    expect(source).toContain('"Lifetime is closed"');
    expect(source).toContain("!summary.lifetimeAvailable");
    expect(source).not.toMatch(/spots? (left|remaining)/i);
  });
});
