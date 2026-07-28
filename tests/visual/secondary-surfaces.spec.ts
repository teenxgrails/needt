import { expect, test } from "@playwright/test";

import { VISUAL_TEST_NOW, VISUAL_TEST_PAGE_ID } from "./fixtures";
import { signInVisualUser } from "./helpers";

type Theme = "dark" | "light";

async function settleSurface(page: import("@playwright/test").Page) {
  await page.addStyleTag({
    content:
      "nextjs-portal, .tsqd-parent-container { display: none !important; }",
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(300);
}

async function applyTheme(page: import("@playwright/test").Page, theme: Theme) {
  const response = await page.request.patch("/api/user-settings", {
    data: { theme },
  });
  expect(response.ok()).toBeTruthy();
  await page.emulateMedia({
    colorScheme: theme,
    reducedMotion: "reduce",
  });
  // The Settings route hydrates the persisted settings store from the API;
  // this mirrors the actual Appearance control before visiting app surfaces.
  await page.goto("/settings#theme", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

test("Pages, Focus, Mail, and AI share the responsive Needt system", async ({
  page,
}, testInfo) => {
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await page.addInitScript(() => {
    localStorage.setItem("mina:quick-tip:last-shown-at", "9999999999999");
    localStorage.setItem("lastBriefingAt", "2026-07-16");
    localStorage.setItem("needt-visit-count", "0");
  });
  await signInVisualUser(page);

  for (const theme of ["dark", "light"] as const) {
    await applyTheme(page, theme);

    await page.goto("/pages", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Pages" })).toBeVisible();
    const visualDesignPage = page
      .getByRole("link", { name: /Visual design notes/ })
      .last();
    await expect(visualDesignPage).toBeVisible();
    await settleSurface(page);

    if (theme === "dark") {
      await page.goto(`/pages/${VISUAL_TEST_PAGE_ID}`);
      await expect(page.getByLabel("Page document")).toBeVisible();
    }

    await page.goto("/focus", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("slider", { name: "Focus duration in minutes" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start timer" })
    ).toBeVisible();
    await settleSurface(page);
    await expect(page).toHaveScreenshot(`focus-${theme}.png`);

    await page.goto("/mail", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Launch review notes")).toBeVisible();
    await settleSurface(page);
    await expect(page).toHaveScreenshot(`mail-list-${theme}.png`);
    await page.getByText("Launch review notes").first().click();
    await expect(
      page.getByRole("heading", { name: "Launch review notes" })
    ).toBeVisible();
    await settleSurface(page);
    await expect(page).toHaveScreenshot(`mail-message-${theme}.png`);

    await page.goto("/chat", { waitUntil: "domcontentloaded" });
    if (testInfo.project.name === "desktop") {
      const seededConversation = page.getByRole("button", {
        name: "Today’s priorities",
      });
      await expect(seededConversation).toBeVisible();
      await seededConversation.click();
    }
    await expect(page.getByText("What should I focus on first?")).toBeVisible();
    await settleSurface(page);
    await expect(page).toHaveScreenshot(`ai-chat-${theme}.png`);
  }
});
