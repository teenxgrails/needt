import { expect, test } from "@playwright/test";

for (const [path, title] of [
  ["/terms", "Terms of Service"],
  ["/privacy", "Privacy Notice"],
] as const) {
  test(`${path} presents the legal owner-review state`, async ({ page }) => {
    await page.goto(path);

    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText("Owner review required")).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/
    );
  });
}
