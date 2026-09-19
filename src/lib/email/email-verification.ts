import { createHash, randomBytes } from "node:crypto";

import { addHours, newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  runTrialTransaction,
  startTrialForVerifiedUser,
} from "@/lib/trials/trial-service";

import { EmailService } from "./email-service";
import { getEmailVerificationTemplate } from "./templates/email-verification";

const LOG_SOURCE = "EmailVerification";
const TOKEN_TTL_HOURS = 24;

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function sendEmailVerification(input: {
  userId: string;
  baseUrl: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true, emailVerified: true, name: true },
  });
  if (!user?.email || user.emailVerified) return { sent: false } as const;

  const email = user.email.trim().toLowerCase();
  const rawToken = randomBytes(32).toString("base64url");
  const hash = tokenHash(rawToken);
  const expires = addHours(newDate(), TOKEN_TTL_HOURS);

  await prisma.verificationToken.deleteMany({
    where: { identifier: email, expires: { lt: newDate() } },
  });
  await prisma.verificationToken.create({
    data: { identifier: email, token: hash, expires },
  });

  const verificationUrl = new URL(
    "/auth/confirm-email",
    input.baseUrl
  );
  verificationUrl.searchParams.set("email", email);
  verificationUrl.searchParams.set("token", rawToken);
  const template = getEmailVerificationTemplate({
    name: user.name || "there",
    verificationUrl: verificationUrl.toString(),
  });
  let result: { jobId: string };
  try {
    result = await EmailService.sendEmail({
      to: email,
      ...template,
    });
  } catch (error) {
    await prisma.verificationToken.deleteMany({
      where: { identifier: email, token: hash },
    });
    throw error;
  }
  await logger.info(
    "Email verification sent",
    { userId: input.userId, jobId: result.jobId },
    LOG_SOURCE
  );
  return { sent: true } as const;
}

export async function confirmEmailVerification(input: {
  email: string;
  token: string;
  now?: Date;
}) {
  const email = input.email.trim().toLowerCase();
  const hash = tokenHash(input.token);
  const now = input.now ?? newDate();

  return runTrialTransaction(async (tx) => {
    const verification = await tx.verificationToken.findUnique({
      where: { identifier_token: { identifier: email, token: hash } },
    });
    if (!verification) return { status: "invalid" as const, trial: false };
    if (verification.expires <= now) {
      await tx.verificationToken.delete({
        where: { identifier_token: { identifier: email, token: hash } },
      });
      return { status: "expired" as const, trial: false };
    }

    const user = await tx.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (!user?.email) return { status: "invalid" as const, trial: false };

    await tx.user.update({
      where: { id: user.id },
      data: { emailVerified: now },
    });
    const grant = await startTrialForVerifiedUser(tx, {
      userId: user.id,
      email: user.email,
      now,
    });
    await tx.verificationToken.deleteMany({ where: { identifier: email } });
    return { status: "verified" as const, trial: Boolean(grant) };
  });
}
