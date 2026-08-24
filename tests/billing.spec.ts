import { encode } from "next-auth/jwt";

import {
  type APIRequestContext,
  expect,
  request as playwrightRequest,
  test,
} from "@playwright/test";
import {
  SubscriptionPlan,
  SubscriptionStatus,
  WorkspaceKind,
  WorkspaceRole,
} from "@prisma/client";
import { createHmac } from "node:crypto";

import { addCalendarDays, newDate } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

import recordedFixtures from "./fixtures/creem/billing-lifecycle.json";

type RecordedFixture = (typeof recordedFixtures)[keyof typeof recordedFixtures];

const baseURL = process.env.TEST_BASE_URL || "http://localhost:3000";
const runId = `${newDate().getTime()}-${Math.random().toString(36).slice(2)}`;
const proEmail = `billing-pro-${runId}@needt.local`;
const lifetimeEmail = `billing-lifetime-${runId}@needt.local`;
const periodEnd = addCalendarDays(newDate(), 30).toISOString();

let proUserId = "";
let lifetimeUserId = "";
let sharedWorkspaceId = "";
let webhookRequest: APIRequestContext;

function materializeFixture(fixture: RecordedFixture, userId: string) {
  return JSON.parse(
    JSON.stringify(fixture)
      .replaceAll("{{USER_ID}}", userId)
      .replaceAll("{{PERIOD_END}}", periodEnd)
  ) as Record<string, unknown>;
}

function sign(body: string) {
  return createHmac(
    "sha256",
    process.env.CREEM_WEBHOOK_SECRET ||
      "creem_test_webhook_secret_for_local_e2e_only"
  )
    .update(body)
    .digest("hex");
}

async function sendWebhook(fixture: RecordedFixture, userId: string) {
  const payload = materializeFixture(fixture, userId);
  const body = JSON.stringify(payload);
  return webhookRequest.post("/api/billing/webhook", {
    data: body,
    headers: {
      "content-type": "application/json",
      "creem-signature": sign(body),
    },
  });
}

async function sessionToken(userId: string, email: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  expect(secret, "NEXTAUTH_SECRET is required for billing e2e").toBeTruthy();
  return encode({
    secret: secret!,
    maxAge: 60 * 60,
    token: { sub: userId, email, role: "user" },
  });
}

async function authenticatedRequest(userId: string, email: string) {
  const token = await sessionToken(userId, email);
  return playwrightRequest.newContext({
    baseURL,
    extraHTTPHeaders: {
      cookie: `next-auth.session-token=${token}`,
    },
  });
}

async function subscription(userId: string) {
  return prisma.subscription.findUniqueOrThrow({ where: { userId } });
}

test.describe("recorded Creem billing lifecycle", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    webhookRequest = await playwrightRequest.newContext({ baseURL });
    const [proUser, lifetimeUser] = await Promise.all([
      prisma.user.create({
        data: {
          email: proEmail,
          name: "Billing Pro Fixture",
          emailVerified: newDate(),
          subscription: {
            create: {
              plan: SubscriptionPlan.FREE,
              status: SubscriptionStatus.ACTIVE,
            },
          },
          featureFlagOverrides: {
            create: { flagKey: "workspaces", enabled: true },
          },
        },
        select: { id: true },
      }),
      prisma.user.create({
        data: {
          email: lifetimeEmail,
          name: "Billing Lifetime Fixture",
          emailVerified: newDate(),
          subscription: {
            create: {
              plan: SubscriptionPlan.FREE,
              status: SubscriptionStatus.ACTIVE,
            },
          },
        },
        select: { id: true },
      }),
    ]);
    proUserId = proUser.id;
    lifetimeUserId = lifetimeUser.id;

    const shared = await prisma.workspace.create({
      data: {
        name: `Billing downgrade ${runId}`,
        kind: WorkspaceKind.SHARED,
        members: {
          create: { userId: proUserId, role: WorkspaceRole.OWNER },
        },
      },
      select: { id: true },
    });
    sharedWorkspaceId = shared.id;
  });

  test.afterAll(async () => {
    if (sharedWorkspaceId) {
      await prisma.workspace.delete({ where: { id: sharedWorkspaceId } });
    }
    await prisma.workspace.deleteMany({
      where: {
        personalOwnerId: { in: [proUserId, lifetimeUserId].filter(Boolean) },
      },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [proUserId, lifetimeUserId].filter(Boolean) } },
    });
    await webhookRequest.dispose();
    await prisma.$disconnect();
  });

  test("rejects a signature after the recorded raw body is tampered with", async () => {
    const payload = materializeFixture(recordedFixtures.proCheckout, proUserId);
    const signedBody = JSON.stringify(payload);
    const tamperedBody = signedBody.replace('"amount":600', '"amount":601');

    const response = await webhookRequest.post("/api/billing/webhook", {
      data: tamperedBody,
      headers: {
        "content-type": "application/json",
        "creem-signature": sign(signedBody),
      },
    });

    expect(response.status()).toBe(400);
    expect(
      await prisma.creemWebhookEvent.findUnique({
        where: { id: recordedFixtures.proCheckout.id },
      })
    ).toBeNull();
  });

  test("grants, cancels with grace, revokes, resubscribes, and recovers payment", async () => {
    const authenticated = await authenticatedRequest(proUserId, proEmail);

    expect(
      (await sendWebhook(recordedFixtures.proCheckout, proUserId)).ok()
    ).toBe(true);
    expect(await subscription(proUserId)).toMatchObject({
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
    });

    expect(
      (await sendWebhook(recordedFixtures.proActive, proUserId)).ok()
    ).toBe(true);
    expect(
      (await sendWebhook(recordedFixtures.proCanceled, proUserId)).ok()
    ).toBe(true);
    const canceled = await subscription(proUserId);
    expect(canceled).toMatchObject({
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.CANCELED,
      cancelAtPeriodEnd: true,
      lastCreemEventId: recordedFixtures.proCanceled.id,
    });
    expect(canceled.currentPeriodEnd?.toISOString()).toBe(periodEnd);

    const graceSummary = await authenticated.get("/api/billing");
    expect(await graceSummary.json()).toMatchObject({
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.CANCELED,
    });
    expect(
      (
        await authenticated.get("/api/tasks", {
          headers: { "x-workspace-id": sharedWorkspaceId },
        })
      ).status()
    ).toBe(200);

    expect(
      (await sendWebhook(recordedFixtures.olderActive, proUserId)).ok()
    ).toBe(true);
    expect(await subscription(proUserId)).toMatchObject({
      status: SubscriptionStatus.CANCELED,
      lastCreemEventId: recordedFixtures.proCanceled.id,
    });
    expect(
      await prisma.creemWebhookEvent.findUniqueOrThrow({
        where: { id: recordedFixtures.olderActive.id },
        select: { outcome: true },
      })
    ).toEqual({ outcome: "stale_event" });

    const beforeReplay = await subscription(proUserId);
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(
      (await sendWebhook(recordedFixtures.proCanceled, proUserId)).ok()
    ).toBe(true);
    const afterReplay = await subscription(proUserId);
    expect(afterReplay.updatedAt.toISOString()).toBe(
      beforeReplay.updatedAt.toISOString()
    );
    expect(
      await prisma.creemWebhookEvent.count({
        where: { id: recordedFixtures.proCanceled.id },
      })
    ).toBe(1);

    expect(
      (await sendWebhook(recordedFixtures.proExpired, proUserId)).ok()
    ).toBe(true);
    const expiredSummary = await authenticated.get("/api/billing");
    expect(await expiredSummary.json()).toMatchObject({
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.CANCELED,
    });
    expect(
      (
        await authenticated.get("/api/tasks", {
          headers: { "x-workspace-id": sharedWorkspaceId },
        })
      ).status()
    ).toBe(403);

    expect(
      (await sendWebhook(recordedFixtures.proResubscribed, proUserId)).ok()
    ).toBe(true);
    expect(await subscription(proUserId)).toMatchObject({
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      creemSubscriptionId: "sub_recorded_pro_2",
      cancelAtPeriodEnd: false,
    });
    expect(
      (
        await authenticated.get("/api/tasks", {
          headers: { "x-workspace-id": sharedWorkspaceId },
        })
      ).status()
    ).toBe(200);

    expect(
      (await sendWebhook(recordedFixtures.proPastDue, proUserId)).ok()
    ).toBe(true);
    expect(
      await (await authenticated.get("/api/billing")).json()
    ).toMatchObject({
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.PAST_DUE,
    });

    expect(
      (await sendWebhook(recordedFixtures.proUnpaid, proUserId)).ok()
    ).toBe(true);
    expect(
      await (await authenticated.get("/api/billing")).json()
    ).toMatchObject({
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.PAYMENT_FAILED,
    });

    expect(
      (await sendWebhook(recordedFixtures.proRecovered, proUserId)).ok()
    ).toBe(true);
    expect(await subscription(proUserId)).toMatchObject({
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      cancelAtPeriodEnd: false,
    });
    await authenticated.dispose();
  });

  test("grants Lifetime without requiring any renewal event", async () => {
    expect(
      (
        await sendWebhook(recordedFixtures.lifetimeCheckout, lifetimeUserId)
      ).ok()
    ).toBe(true);
    const purchased = await subscription(lifetimeUserId);
    expect(purchased).toMatchObject({
      plan: SubscriptionPlan.LIFETIME,
      status: SubscriptionStatus.ACTIVE,
      creemSubscriptionId: null,
      interval: null,
      lastCreemEventId: recordedFixtures.lifetimeCheckout.id,
    });

    const unrelatedPro = materializeFixture(
      recordedFixtures.proActive,
      lifetimeUserId
    );
    unrelatedPro.id = "evt_recorded_pro_after_lifetime";
    unrelatedPro.created_at =
      recordedFixtures.lifetimeCheckout.created_at + 1_000;
    const body = JSON.stringify(unrelatedPro);
    const response = await webhookRequest.post("/api/billing/webhook", {
      data: body,
      headers: {
        "content-type": "application/json",
        "creem-signature": sign(body),
      },
    });
    expect(response.ok()).toBe(true);
    expect(await subscription(lifetimeUserId)).toMatchObject({
      plan: SubscriptionPlan.LIFETIME,
      status: SubscriptionStatus.ACTIVE,
      lastCreemEventId: recordedFixtures.lifetimeCheckout.id,
    });
  });
});
