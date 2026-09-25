import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NEEDT_PRICING } from "@/lib/creem/config";

describe("Settings search contract", () => {
  const screenSource = readFileSync(
    join(process.cwd(), "src/components/needt/settings/SettingsScreen.tsx"),
    "utf8"
  );
  const routeSource = readFileSync(
    join(process.cwd(), "src/components/needt/settings/SettingsRoute.tsx"),
    "utf8"
  );
  const billingSource = readFileSync(
    join(process.cwd(), "src/components/settings/BillingSettings.tsx"),
    "utf8"
  );
  const aiSource = readFileSync(
    join(process.cwd(), "src/components/settings/AIAssistantSettings.tsx"),
    "utf8"
  );

  it("filters the ported navigation and keeps a mobile section picker", () => {
    expect(screenSource).toContain('placeholder="Find a setting"');
    expect(screenSource).toContain("filterSettingsSections(query)");
    expect(screenSource).toContain("Nothing matches");
    expect(screenSource).toContain('ariaLabel="Settings section"');
  });

  it("binds every ported section and keeps legacy deep links", () => {
    for (const section of [
      "appearance",
      "day",
      "calendars",
      "tasks",
      "focus",
      "alerts",
      "keys",
      "account",
      "data",
    ]) {
      expect(routeSource).toContain(`${section}: (`);
    }
    for (const alias of [
      "auto-schedule",
      "smart-scheduling",
      "task-sync",
      "task-urgency",
      "user",
      "connectors",
      "subscription",
    ]) {
      const key = /^[a-z]+$/.test(alias) ? alias : JSON.stringify(alias);
      expect(routeSource).toContain(`${key}:`);
    }
  });

  it("keeps launch pricing and hides numeric AI usage from the UI", () => {
    expect(NEEDT_PRICING.pro.month.amountCents).toBe(700);
    expect(NEEDT_PRICING.pro.year.amountCents).toBe(6_000);
    expect(NEEDT_PRICING.lifetime.amountCents).toBe(14_900);
    expect(billingSource).not.toContain("summary.usage.aiActions");
    expect(billingSource).not.toContain("Hosted AI actions this month");
    expect(aiSource).not.toContain("actions left");
    expect(aiSource).not.toContain("settings.usage");
  });
});
