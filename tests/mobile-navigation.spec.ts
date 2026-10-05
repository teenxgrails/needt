import { encode } from "next-auth/jwt";

import { type Page, expect, test } from "@playwright/test";
import { existsSync } from "node:fs";

if (!process.env.NEXTAUTH_SECRET && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

/* The phone carries the design's own bottom bar — four tabs and nothing else.
 * The pre-port dock had five and lived in `AppNav`; it is the tablet's alone
 * now. Both halves of that swap are asserted here, because each one has
 * silently come back once already: the shell hides its rail below `lg`, so a
 * phone that loses this bar has no navigation at all, and a phone that keeps
 * the old dock shows two bars stacked. */

const user = { id: "mobile-nav-e2e-user", email: "mobile-nav-e2e@needt.local" };

const TABS = ["Home", "Calendar", "Workspace", "Docs"] as const;

test.use({ viewport: { width: 375, height: 812 } });

async function authenticate(page: Page) {
  const secret = process.env.NEXTAUTH_SECRET;
  expect(secret, "NEXTAUTH_SECRET is required for mobile nav E2E").toBeTruthy();
  const token = await encode({
    secret: secret!,
    maxAge: 60 * 60,
    token: { sub: user.id, email: user.email, role: "user" },
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

async function stubApis(page: Page) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/session") {
      return route.fulfill({
        json: { user, expires: "2027-01-01T00:00:00.000Z" },
      });
    }
    if (url.pathname === "/api/needt/shell") {
      return route.fulfill({
        json: {
          workspaceId: "workspace-mobile-nav-e2e",
          now: "2026-09-15T09:00:00.000Z",
          tasks: [],
          people: [],
          pinned: [],
        },
      });
    }
    return route.fulfill({ json: [] });
  });
}

test("The phone navigates with the design's bottom bar, not the old dock", async ({
  page,
}) => {
  await authenticate(page);
  await stubApis(page);

  await page.goto("/today");

  const bar = page.locator("nav").filter({ hasText: "Workspace" }).last();
  for (const tab of TABS) {
    await expect(bar.getByRole("button", { name: tab })).toBeVisible();
  }
  await expect(bar.getByRole("button", { name: "Home" })).toHaveAttribute(
    "aria-current",
    "page"
  );

  // The old dock's own destinations are the tell: it carried Focus and
  // Moodboards, which the design's bar does not have.
  await expect(page.getByRole("link", { name: "Focus" })).toBeHidden();

  await bar.getByRole("button", { name: "Calendar" }).click();
  await expect(page).toHaveURL(/\/calendar$/);
  await expect(bar.getByRole("button", { name: "Calendar" })).toHaveAttribute(
    "aria-current",
    "page"
  );
});
