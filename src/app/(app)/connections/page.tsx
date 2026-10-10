import { notFound } from "next/navigation";

import { ConnectionsScreen } from "@/components/needt3/connections/ConnectionsScreen";

import { isDesignV3 } from "@/lib/needt3/design-flag";

export const dynamic = "force-dynamic";

/** Connections is a design v3 place; with the flag off the route does not exist. */
export default async function ConnectionsRoute() {
  if (!(await isDesignV3())) notFound();
  return <ConnectionsScreen />;
}
