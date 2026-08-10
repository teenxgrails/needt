import { PublicPageView } from "@/components/pages/PublicPageView";

export default async function PublishedPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PublicPageView token={token} />;
}
