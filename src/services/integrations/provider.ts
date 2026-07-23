export type IntegrationPermission = "read" | "write";

export interface IntegrationCatalogItem {
  slug: string;
  name: string;
  description: string;
  category: "calendar" | "tasks" | "notes" | "communication" | "files" | "developer" | "ai";
  iconUrl?: string;
  native?: boolean;
  configured: boolean;
}

export interface IntegrationConnectResult {
  connectionId: string;
  redirectUrl: string;
}

export interface IntegrationActionInput {
  userId: string;
  toolkit: string;
  tool: string;
  arguments: Record<string, unknown>;
  permission: IntegrationPermission;
  confirmed: boolean;
}

export interface IntegrationProvider {
  readonly id: string;
  isConfigured(): boolean;
  listCatalog(): Promise<IntegrationCatalogItem[]>;
  initiateConnection(input: {
    userId: string;
    toolkit: string;
    callbackUrl: string;
  }): Promise<IntegrationConnectResult>;
  executeAction(input: IntegrationActionInput): Promise<unknown>;
}
