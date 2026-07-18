import { Creem } from "creem";

type CachedClient = {
  apiKey: string;
  apiUrl: string | null;
  client: Creem;
};

let cachedClient: CachedClient | null = null;

export function getCreemClient(): Creem {
  const apiKey = process.env.CREEM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Creem is not configured.");
  }

  const apiUrl = process.env.CREEM_API_URL?.trim() || null;
  if (cachedClient?.apiKey === apiKey && cachedClient.apiUrl === apiUrl) {
    return cachedClient.client;
  }

  const client = new Creem({
    apiKey,
    ...(apiUrl
      ? { serverURL: apiUrl }
      : { server: process.env.NODE_ENV === "production" ? "prod" : "test" }),
  });
  cachedClient = { apiKey, apiUrl, client };
  return client;
}
