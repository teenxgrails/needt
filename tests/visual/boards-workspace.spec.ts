import { expect, test } from "@playwright/test";

import { VISUAL_TEST_BOARD_ID, VISUAL_TEST_NOW } from "./fixtures";
import { signInVisualUser } from "./helpers";

type Theme = "dark" | "light";

async function settleBoard(page: import("@playwright/test").Page) {
  await page.addStyleTag({
    content:
      "nextjs-portal, .tsqd-parent-container { display: none !important; }",
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(250);
}

async function useTheme(page: import("@playwright/test").Page, theme: Theme) {
  const response = await page.request.patch("/api/user-settings", {
    data: { theme },
  });
  expect(response.ok()).toBeTruthy();
  await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
}

async function applyTheme(page: import("@playwright/test").Page, theme: Theme) {
  await page.evaluate((nextTheme) => {
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, theme);
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

test("board workspace exposes every data view", async ({ page }) => {
  await page.clock.setFixedTime(new Date(VISUAL_TEST_NOW));
  await page.addInitScript((boardId) => {
    localStorage.setItem(`needt:board:${boardId}:view`, "board");
    localStorage.setItem("needt-visit-count", "0");
  }, VISUAL_TEST_BOARD_ID);
  await signInVisualUser(page);
  await useTheme(page, "dark");
  await page.goto(`/boards/${VISUAL_TEST_BOARD_ID}`, {
    waitUntil: "networkidle",
  });
  await applyTheme(page, "dark");

  await expect(
    page.getByRole("heading", { name: "Launch plan", level: 1 })
  ).toBeVisible();

  for (const view of [
    "Table",
    "Board",
    "List",
    "Timeline",
    "Calendar",
    "Gallery",
  ]) {
    const tab = page.getByRole("tab", { name: view });
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    if (view === "Table") {
      await expect(page.getByText("Stage", { exact: true })).toBeVisible();
    }
    if (view === "Timeline" || view === "Calendar") {
      await expect(page.getByLabel("Previous range")).toBeVisible();
    }
    if (view === "Gallery") {
      await expect(page.getByText("Morning deep work").first()).toBeVisible();
    }
  }

  await expect(page.getByText("Morning deep work").first()).toBeVisible();
  await page.getByRole("tab", { name: "Board" }).click();
  await settleBoard(page);
  await expect(page).toHaveScreenshot("notion-board-workspace.png");

  await useTheme(page, "light");
  await page.goto(`/boards/${VISUAL_TEST_BOARD_ID}`, {
    waitUntil: "networkidle",
  });
  await applyTheme(page, "light");
  await settleBoard(page);
  await expect(page).toHaveScreenshot("notion-board-workspace-light.png");
});

test("new board opens as a full-page view chooser", async ({ page }) => {
  await signInVisualUser(page);
  await useTheme(page, "dark");
  await page.goto("/boards", { waitUntil: "networkidle" });
  await applyTheme(page, "dark");
  await page.getByRole("button", { name: "New board" }).last().click();

  await expect(
    page.getByRole("dialog", { name: "Create a new board" })
  ).toBeVisible();
  await expect(page.getByLabel("Board name")).toBeVisible();
  await expect(page.getByLabel("Board name")).not.toBeFocused();
  for (const view of [
    "Table",
    "Board",
    "List",
    "Timeline",
    "Calendar",
    "Gallery",
  ]) {
    await expect(
      page.getByRole("button", { name: new RegExp(view) }).last()
    ).toBeVisible();
  }
  await settleBoard(page);
  await expect(page).toHaveScreenshot("notion-board-create.png", {
    caret: "initial",
  });
  await page.getByLabel("Board name").fill("Product launch");
  await expect(page.getByLabel("Board name")).toHaveText("Product launch");
});
