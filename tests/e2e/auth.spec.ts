import { expect, test } from "@playwright/test";

test("sign-in treats an external callbackUrl as a local calendar fallback", async ({
  page,
}) => {
  await page.goto("/auth/signin?callbackUrl=https://attacker.invalid");

  await expect(
    page.getByRole("heading", { name: "Sign in to Needt" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  await expect(page.getByText("Manage your calendar and tasks efficiently")).toHaveCount(
    0
  );
});
