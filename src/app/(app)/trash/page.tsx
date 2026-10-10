import { notFound } from "next/navigation";

import { TrashScreen } from "@/components/needt3/places/TrashScreen";

import { isDesignV3 } from "@/lib/needt3/design-flag";

export const dynamic = "force-dynamic";

/** Trash is a design v3 place; with the flag off the route does not exist. */
export default async function TrashRoute() {
  if (!(await isDesignV3())) notFound();
  return <TrashScreen />;
}
