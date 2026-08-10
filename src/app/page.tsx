import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

import { getAuthOptions } from "@/lib/auth/auth-options";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const authOptions = await getAuthOptions();
  const session = await getServerSession(authOptions);

  redirect(session ? "/calendar" : "/auth/signin");
}
