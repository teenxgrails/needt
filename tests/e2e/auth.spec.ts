import { expect, test } from "@playwright/test";

test("sign-in treats an external callbackUrl as a local calendar fallback", async ({
  page,
}) => {
  await page.goto("/auth/signin?callbackUrl=https://attacker.invalid");

  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true })
  ).toBeVisible();
  // Nothing the hostile parameter carried reaches the page.
  await expect(page.getByText("attacker.invalid")).toHaveCount(0);
});
