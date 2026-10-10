import { MoodboardsHome } from "@/components/moodboards/MoodboardsHome";
import { MoodboardsScreen } from "@/components/needt3/places/MoodboardsScreen";

import { isDesignV3 } from "@/lib/needt3/design-flag";

export const dynamic = "force-dynamic";

export default async function MoodboardsPage() {
  if (await isDesignV3()) return <MoodboardsScreen />;
  return <MoodboardsHome />;
}
