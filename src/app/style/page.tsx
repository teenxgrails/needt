import { notFound } from "next/navigation";

import { DesignSystemLab } from "@/components/ui/design-system-lab";

import { isAdmin } from "@/lib/auth/is-admin";
import { APP_NAME } from "@/lib/app-config";

export const metadata = {
  title: `${APP_NAME} UI system`,
};

export default async function StylePage() {
  if (process.env.NODE_ENV === "production" && !(await isAdmin())) {
    notFound();
  }

  return <DesignSystemLab />;
}
