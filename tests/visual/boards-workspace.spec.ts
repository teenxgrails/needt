import { expect, test } from "@playwright/test";

import { VISUAL_TEST_NOW } from "./fixtures";
import { signInVisualUser } from "./helpers";

async function settle(page: import("@playwright/test").Page) {
  await page.addStyleTag({
    content:
      "nextjs-portal, .tsqd-parent-container { display: none !important; }",
  });
  await page.evaluate(async () => document.fonts.ready);
  await page.waitForTimeout(250);
}

test("Pages replaces legacy Boards with documents and databases", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await page.addInitScript(() => {
    localStorage.setItem("needt:quick-tip:last-shown-at", "9999999999999");
    localStorage.setItem("needt-visit-count", "0");
  });
  await signInVisualUser(page);
  await page.goto("/pages", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Pages" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "New page" }).last()
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Database/ })).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot("pages-workspace.png");

  await page.goto("/boards", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/pages$/);
});
