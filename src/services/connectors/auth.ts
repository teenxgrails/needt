import crypto from "crypto";

import { prisma } from "@/lib/prisma";

export function generateConnectorToken() {
  return `mina_${crypto.randomBytes(32).toString("base64url")}`;
}

export function hashConnectorToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function ensureConnectorSettings(userId: string) {
  return prisma.connectorSettings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function authenticateConnectorToken(authHeader: string | null) {
  const [scheme, token] = authHeader?.split(" ") ?? [];
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  const settings = await prisma.connectorSettings.findUnique({
    where: { tokenHash: hashConnectorToken(token) },
  });

  return settings?.userId ?? null;
}
