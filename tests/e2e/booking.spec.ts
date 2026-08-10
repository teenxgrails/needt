import { expect, test } from "@playwright/test";

test("signed-out booking paths do not redirect to sign-in", async ({ page }) => {
  await page.goto("/book/unknown-booking-page", {
    waitUntil: "domcontentloaded",
  });

  expect(new URL(page.url()).pathname).toBe("/book/unknown-booking-page");
  await expect(page.getByText("Sign in to Needt")).toHaveCount(0);
});
