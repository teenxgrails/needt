import { expect, test } from "@playwright/test";

import { VISUAL_TEST_BOARD_ID, VISUAL_TEST_NOW } from "./fixtures";
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

async function useTheme(page: import("@playwright/test").Page, theme: Theme) {
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
  await page.goto("/settings#theme", { waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

test("Boards, Focus, Mail, and AI share the responsive Needt system", async ({
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
    await useTheme(page, theme);

    await page.goto(`/boards/${VISUAL_TEST_BOARD_ID}`, {
      waitUntil: "networkidle",
    });
    await expect(
      page.getByRole("heading", { name: "Launch plan", level: 1 })
    ).toBeVisible();
    await expect(page.getByText("Morning deep work")).toBeVisible();
    await settleSurface(page);

    if (theme === "dark") {
      await page
        .getByRole("button", { name: /Morning deep work/ })
        .first()
        .click();
      await expect(page.getByTestId("task-modal")).toBeVisible();
      await page.keyboard.press("Escape");
    }

    await page.goto("/focus", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: "Focus", exact: true })
    ).toBeVisible();
    await expect(page.getByText("25:00")).toBeVisible();
    await settleSurface(page);
    await expect(page).toHaveScreenshot(`focus-${theme}.png`);
    if (theme === "dark" && testInfo.project.name === "mobile") {
      await page.getByRole("button", { name: "Start free session" }).click();
      await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
      await page.getByRole("button", { name: "Stop" }).click();
      await expect(
        page.getByRole("heading", { name: "Leave early?" })
      ).toBeVisible();
      await settleSurface(page);
      await expect(page).toHaveScreenshot("focus-leave-early-dark.png");
      await page.getByRole("button", { name: "End session" }).click();
      await expect(
        page.getByRole("button", { name: "Start free session" })
      ).toBeVisible();
    }

    await page.goto("/mail", { waitUntil: "networkidle" });
    await expect(page.getByText("Launch review notes")).toBeVisible();
    await settleSurface(page);
    await expect(page).toHaveScreenshot(`mail-list-${theme}.png`);
    await page.getByText("Launch review notes").first().click();
    await expect(
      page.getByRole("heading", { name: "Launch review notes" })
    ).toBeVisible();
    await settleSurface(page);
    await expect(page).toHaveScreenshot(`mail-message-${theme}.png`);

    await page.goto("/chat", { waitUntil: "networkidle" });
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
