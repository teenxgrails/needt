import { getServerSession } from "next-auth";

import { PageWorkspace } from "@/components/pages/PageWorkspace";

import { getAuthOptions } from "@/lib/auth/auth-options";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

export default async function PagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(await getAuthOptions());
  const editorV2 = session?.user?.id
    ? await isFeatureEnabled("editor_v2", session.user.id)
    : false;
  return (
    <PageWorkspace
      pageId={id}
      documentFormatVersion={editorV2 ? 2 : 1}
    />
  );
}
