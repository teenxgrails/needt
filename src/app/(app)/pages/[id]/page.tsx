import { PageWorkspace } from "@/components/pages/PageWorkspace";

export default async function PagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PageWorkspace pageId={id} />;
}
