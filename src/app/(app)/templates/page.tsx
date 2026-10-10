import { notFound } from "next/navigation";

import { TemplatesScreen } from "@/components/needt3/places/TemplatesScreen";

import { isDesignV3 } from "@/lib/needt3/design-flag";

export const dynamic = "force-dynamic";

/** Templates is a design v3 place; with the flag off the route does not exist. */
export default async function TemplatesRoute() {
  if (!(await isDesignV3())) notFound();
  return <TemplatesScreen />;
}
