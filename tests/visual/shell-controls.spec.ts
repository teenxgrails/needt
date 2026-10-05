import { expect, test } from "@playwright/test";

import { signInVisualUser } from "./helpers";

/* The shell was composed against the design preview, where every control had
 * a slot filled in by the preview itself. Mounted on the application those
 * slots are empty unless something supplies them, and an unsupplied one is a
 * control that looks alive and does nothing. Three have been found that way
 * already. A screenshot cannot see the difference, so the live ones are
 * asserted here. */
test.skip(
  ({ viewport }) => (viewport?.width ?? 0) < 1024,
  "The rail is a desktop surface, and this is behaviour, not a picture."
);

test("The rail's controls reach the application, not an empty slot", async ({
  page,
}) => {
  await signInVisualUser(page);
  await page.goto("/today");

  // The search bar opens the command palette the application ships, not the
  // shell's own, which is never mounted here.
  await page.getByText("Find anything").click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 10_000 });
});
