import type { IntegrationCatalogItem } from "./provider";
import { composioProvider } from "./composio-provider";

const nativeIntegrations: IntegrationCatalogItem[] = [
  { slug: "google-calendar", name: "Google Calendar", description: "Realtime calendar sync", category: "calendar", native: true, configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) },
  { slug: "outlook-calendar", name: "Outlook Calendar", description: "Microsoft calendar sync", category: "calendar", native: true, configured: Boolean(process.env.OUTLOOK_CLIENT_ID && process.env.OUTLOOK_CLIENT_SECRET) },
  { slug: "icloud-calendar", name: "Apple / iCloud", description: "Private CalDAV calendar sync", category: "calendar", native: true, configured: true },
  { slug: "needt-api", name: "Needt API", description: "Connect scripts and personal automations", category: "developer", native: true, configured: true },
];

export async function getIntegrationCatalog() {
  return [...nativeIntegrations, ...(await composioProvider.listCatalog())];
}
