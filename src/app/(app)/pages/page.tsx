import { DocsScreen } from "@/components/needt3/docs/DocsScreen";
import { DocsRoute } from "@/components/needt/docs";

import { isDesignV3 } from "@/lib/needt3/design-flag";

export default async function PagesPage() {
  if (await isDesignV3()) return <DocsScreen />;
  return <DocsRoute />;
}
