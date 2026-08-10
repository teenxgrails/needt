import { expect, test } from "@playwright/test";

for (const [token, status, heading] of [
  ["missing-public-page", 404, "Page not found"],
  ["revoked-public-page", 410, "This Page is no longer available"],
] as const) {
  test(`public Pages render the ${status} state`, async ({ page }) => {
    await page.route(
      `**/api/public/pages/${token}`,
      async (route) =>
        route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify({ error: heading }),
        })
    );

    await page.goto(`/p/${token}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  });
}
