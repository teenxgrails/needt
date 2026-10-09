import { getServerSession } from "next-auth";

import { EmailVerificationGate } from "@/components/auth/EmailVerificationGate";
import { AppShell } from "@/components/layout/AppShell";
import { V3Root } from "@/components/needt3/root/V3Root";

import { getAuthOptions } from "@/lib/auth/auth-options";
import { getEmailVerificationStatus } from "@/lib/auth/email-verification-access";
import { isDesignV3 } from "@/lib/needt3/design-flag";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(await getAuthOptions());
  const verification = session?.user?.id
    ? await getEmailVerificationStatus(session.user.id)
    : null;

  if (verification?.required && !verification.verified) {
    return <EmailVerificationGate initialStatus={verification} />;
  }

  // design_v3 is off for everyone by default (rollout 0 %); the frame is
  // reached only through a per-user override.
  if (session?.user?.id && (await isDesignV3())) {
    return (
      <EmailVerificationGate initialStatus={verification}>
        <V3Root>{children}</V3Root>
      </EmailVerificationGate>
    );
  }

  return (
    <EmailVerificationGate initialStatus={verification}>
      <AppShell>{children}</AppShell>
    </EmailVerificationGate>
  );
}
