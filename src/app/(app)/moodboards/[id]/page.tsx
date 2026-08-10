import { MoodboardWorkspace } from "@/components/moodboards/MoodboardWorkspace";

export default async function MoodboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MoodboardWorkspace moodboardId={id} />;
}
