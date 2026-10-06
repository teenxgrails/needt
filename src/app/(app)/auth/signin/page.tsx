import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

import { SignInRoute } from "@/components/needt/auth/SignInRoute";

import { APP_NAME } from "@/lib/app-config";
import { getAuthOptions } from "@/lib/auth/auth-options";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Sign In | ${APP_NAME}`,
  description: `Sign in to your ${APP_NAME} account`,
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  // Check if user is already signed in
  const authOptions = await getAuthOptions();
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/calendar");
  }

  const { callbackUrl, error } = await searchParams;

  // The screen draws its own full-bleed frame, so the page adds none.
  return <SignInRoute callbackUrl={callbackUrl} error={error} />;
}
