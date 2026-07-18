import { assembleAgentSystemPrompt } from "../system-prompt";
import { hostedUsageStatus, resolveAiAccessMode } from "../usage";

describe("agent prompt assembly", () => {
  it("ranks memories and stays within the requested budget", () => {
    const result = assembleAgentSystemPrompt({
      soulPreset: "business",
      scheduleSummary: "Two scheduled tasks.",
      tokenBudget: 400,
      memories: [
        {
          id: "low",
          kind: "fact",
          content: "Low value",
          weight: 0.1,
          lastUsedAt: new Date(0),
        },
        {
          id: "high",
          kind: "preference",
          content: "Prefer deep work before noon",
          weight: 9,
          lastUsedAt: new Date(),
        },
      ],
    });
    expect(result.estimatedTokens).toBeLessThanOrEqual(400);
    expect(result.usedMemoryIds[0]).toBe("high");
  });
});

describe("hosted AI metering", () => {
  it("stops at the configured cap", () => {
    const cap = hostedUsageStatus(Number.MAX_SAFE_INTEGER, "PRO").limit;
    expect(hostedUsageStatus(cap - 1, "PRO").allowed).toBe(true);
    expect(hostedUsageStatus(cap, "PRO").allowed).toBe(false);
  });

  it("prefers BYOK and only falls back to hosted while allowance remains", () => {
    expect(
      resolveAiAccessMode({
        hasByok: true,
        hostedAvailable: true,
        hostedAllowed: false,
      })
    ).toBe("byok");
    expect(
      resolveAiAccessMode({
        hasByok: false,
        hostedAvailable: true,
        hostedAllowed: true,
      })
    ).toBe("hosted");
    expect(
      resolveAiAccessMode({
        hasByok: false,
        hostedAvailable: true,
        hostedAllowed: false,
      })
    ).toBe("none");
  });
});
