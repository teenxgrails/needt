import { getServerSession } from "next-auth";

import { EmailVerificationGate } from "@/components/auth/EmailVerificationGate";
import { AppShell } from "@/components/layout/AppShell";

import { getAuthOptions } from "@/lib/auth/auth-options";
import { getEmailVerificationStatus } from "@/lib/auth/email-verification-access";

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

  return (
    <EmailVerificationGate initialStatus={verification}>
      <AppShell>{children}</AppShell>
    </EmailVerificationGate>
  );
}
