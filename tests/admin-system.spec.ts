import { encode } from "next-auth/jwt";

import { expect, test } from "@playwright/test";

import { prisma } from "@/lib/prisma";

async function useSeededSession(
  page: import("@playwright/test").Page,
  email: string
) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });
  expect(user).toBeTruthy();

  const secret = process.env.NEXTAUTH_SECRET;
  expect(
    secret,
    "NEXTAUTH_SECRET is required for admin E2E coverage"
  ).toBeTruthy();
  const token = await encode({
    secret: secret!,
    maxAge: 60 * 60,
    token: { sub: user!.id, email, role: user!.role },
  });
  await page.context().addCookies([
    {
      name: "next-auth.session-token",
      value: token,
      url: process.env.TEST_BASE_URL ?? "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

test("an admin can reach the system credential form", async ({ page }) => {
  await useSeededSession(page, "ci-lifetime@needt.local");

  await page.goto("/admin/system");

  await expect(page.getByTestId("admin-system-form")).toBeVisible();
  await expect(
    page.getByPlaceholder("Enter your client secret").first()
  ).toBeVisible();
  await expect(
    page.getByPlaceholder("your-client-id", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Operations", exact: true })
  ).toBeVisible();
});

test("a non-admin sees access denied instead of system credentials", async ({
  page,
}) => {
  await useSeededSession(page, "ci-free@needt.local");

  await page.goto("/admin/system");

  await expect(page.getByTestId("admin-system-access-denied")).toContainText(
    "You do not have permission to access system settings."
  );
  await expect(page.getByTestId("admin-system-form")).toHaveCount(0);
});
