import { getServerSession } from "next-auth";

import { TodayView } from "@/components/today/TodayView";

import { getAuthOptions } from "@/lib/auth/auth-options";
import { isFeatureEnabled } from "@/lib/feature-flags";

export default async function TodayPage() {
  const session = await getServerSession(await getAuthOptions());
  const editorV2 = session?.user?.id
    ? await isFeatureEnabled("editor_v2", session.user.id)
    : false;
  return (
    <div className="h-full">
      <TodayView documentFormatVersion={editorV2 ? 2 : 1} />
    </div>
  );
}
