import { hash } from "bcryptjs";

import {
  PrismaClient,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("Needt-ci-Password1", 8);

  for (const plan of [
    SubscriptionPlan.FREE,
    SubscriptionPlan.PRO,
    SubscriptionPlan.LIFETIME,
  ]) {
    const email = `ci-${plan.toLowerCase()}@needt.local`;
    const user = await prisma.user.upsert({
      where: { email },
      update: { role: plan === SubscriptionPlan.LIFETIME ? "admin" : "user" },
      create: {
        email,
        name: `CI ${plan}`,
        role: plan === SubscriptionPlan.LIFETIME ? "admin" : "user",
      },
    });

    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "credentials",
          providerAccountId: email,
        },
      },
      update: { userId: user.id, id_token: passwordHash },
      create: {
        userId: user.id,
        type: "credentials",
        provider: "credentials",
        providerAccountId: email,
        id_token: passwordHash,
      },
    });

    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: { plan, status: SubscriptionStatus.ACTIVE },
      create: { userId: user.id, plan, status: SubscriptionStatus.ACTIVE },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
