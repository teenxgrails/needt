import { notFound } from "next/navigation";

import { HabitsScreen } from "@/components/needt3/habits/HabitsScreen";

import { isDesignV3 } from "@/lib/needt3/design-flag";

export const dynamic = "force-dynamic";

/** Habits is a design v3 place; with the flag off the route does not exist. */
export default async function HabitsRoute() {
  if (!(await isDesignV3())) notFound();
  return <HabitsScreen />;
}
