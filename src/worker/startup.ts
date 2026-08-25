import { warnIfVapidConfigurationIsMissingOnce } from "@/services/reminders/reminder-delivery";

export async function runWorkerStartupChecks() {
  await warnIfVapidConfigurationIsMissingOnce();
}
