import { expect } from "@playwright/test";
import { encode } from "next-auth/jwt";

import { prisma } from "@/lib/prisma";

import { VISUAL_TEST_EMAIL } from "./fixtures";
import { resetVisualTaskData } from "./global-setup";

export async function signInVisualUser(page: import("@playwright/test").Page) {
  const user = await prisma.user.findUnique({
    where: { email: VISUAL_TEST_EMAIL },
    select: { id: true },
  });
  expect(user).toBeTruthy();
  await Promise.all([
    prisma.dailyAgenda.deleteMany({ where: { userId: user!.id } }),
    prisma.focusSession.deleteMany({ where: { userId: user!.id } }),
  ]);
  await resetVisualTaskData(user!.id);

  // Visual specs authenticate a fixed test fixture directly. Repeatedly
  // exercising the credentials endpoint here would correctly trigger the
  // production account limiter and make screenshot coverage order-dependent;
  // credentials/rate-limit behavior is covered by the API E2E suite.
  const token = await encode({
    secret:
      process.env.NEXTAUTH_SECRET ?? "needt-visual-regression-secret",
    maxAge: 60 * 60,
    token: {
      sub: user!.id,
      email: VISUAL_TEST_EMAIL,
      name: "Visual QA",
      role: "admin",
    },
  });
  await page.context().addCookies([
    {
      name: "next-auth.session-token",
      value: token,
      url: process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
