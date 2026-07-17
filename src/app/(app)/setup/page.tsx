import { redirect } from "next/navigation";

import { SetupForm } from "@/components/setup/SetupForm";

import { APP_NAME } from "@/lib/app-config";
import { checkSetupStatus } from "@/lib/setup-actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Setup ${APP_NAME}`,
  description: `Set up your ${APP_NAME} account`,
};

export default async function SetupPage() {
  // Check if any users already exist
  const { needsSetup } = await checkSetupStatus();

  // If users already exist, redirect to home page
  if (!needsSetup) {
    redirect("/calendar");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-4xl font-bold">{APP_NAME} Setup</h1>
        <p className="text-muted-foreground">
          Create your local planner account to get started
        </p>
      </div>

      <SetupForm />
    </div>
  );
}
