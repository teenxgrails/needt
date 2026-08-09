import { safeCallbackPath } from "@/lib/auth/callback-url";

describe("safeCallbackPath", () => {
  it.each([
    ["/calendar", "/calendar"],
    ["/book/intro?slot=1#details", "/book/intro?slot=1#details"],
    [undefined, "/calendar"],
    ["https://attacker.invalid", "/calendar"],
    ["//attacker.invalid", "/calendar"],
    ["/\\attacker.invalid", "/calendar"],
    ["calendar", "/calendar"],
  ])("accepts only a local callback path: %s", (value, expected) => {
    expect(safeCallbackPath(value)).toBe(expected);
  });
});
