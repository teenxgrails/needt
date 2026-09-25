import { test } from "@playwright/test";

import { VISUAL_TEST_NOW } from "./fixtures";
import { signInVisualUser } from "./helpers";

test("focus probe", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await signInVisualUser(page);
  await page.goto("/focus", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(12000);
  const buttons = await page.getByRole("button").allInnerTexts();
  console.log("FOCUSBTNS", JSON.stringify(buttons.slice(0, 20)));
});
