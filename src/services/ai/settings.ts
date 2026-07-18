import { AIProvider } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { decryptSecret } from "./encryption";
import { getCustomAIOAuthAccessToken, getCustomAIOAuthConfig } from "./oauth";
import { createSchedulerAI } from "./providers";
import { AIProviderName, SchedulerAIConfig } from "./types";
import {
  HOSTED_AI_CONFIG,
  getHostedAiUsage,
  resolveAiAccessMode,
} from "./usage";

export function getDefaultCustomAIUrl() {
  return process.env.AI_CUSTOM_URL?.trim() || null;
}

export async function ensureAISettings(userId: string) {
  return prisma.aISettings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      provider: "NONE",
      allowParseTasks: true,
      allowReorder: false,
      allowSuggestEnergy: true,
      allowFullAuto: false,
      requestTimeoutSeconds: 20,
      customUrl: getDefaultCustomAIUrl(),
    },
  });
}

export function publicAISettings(
  settings: Awaited<ReturnType<typeof ensureAISettings>>,
  oauth?: {
    available: boolean;
    connected: boolean;
    expiresAt: string | null;
  }
) {
  return {
    provider: settings.provider,
    hasApiKey: Boolean(getEncryptedKeyForProvider(settings, settings.provider)),
    providerKeys: {
      ANTHROPIC: Boolean(settings.encryptedAnthropicKey),
      OPENAI: Boolean(settings.encryptedOpenAIKey),
      GROK: Boolean(settings.encryptedGrokKey),
      GLM: Boolean(settings.encryptedGlmKey),
      CUSTOM: Boolean(settings.encryptedApiKey),
    },
    customUrl: settings.customUrl || getDefaultCustomAIUrl(),
    model: settings.model,
    soulPreset: settings.soulPreset,
    allowParseTasks: settings.allowParseTasks,
    allowReorder: settings.allowReorder,
    allowSuggestEnergy: settings.allowSuggestEnergy,
    allowFullAuto: settings.allowFullAuto,
    requestTimeoutSeconds: settings.requestTimeoutSeconds,
    hostedAvailable: Boolean(process.env.NEEDT_AI_API_KEY?.trim()),
    oauth: oauth || {
      available: false,
      connected: false,
      expiresAt: null,
    },
  };
}

export async function publicAISettingsWithOAuth(
  settings: Awaited<ReturnType<typeof ensureAISettings>>
) {
  const connection = await prisma.aIOAuthConnection.findUnique({
    where: {
      userId_provider: { userId: settings.userId, provider: AIProvider.CUSTOM },
    },
  });

  let available = false;
  try {
    available = Boolean(getCustomAIOAuthConfig());
  } catch {
    // Bad deployment configuration must not make the whole settings page fail.
  }

  return {
    ...publicAISettings(settings, {
      available,
      connected: Boolean(connection),
      expiresAt: connection?.expiresAt?.toISOString() || null,
    }),
    usage: await getHostedAiUsage(settings.userId),
  };
}

export function getEncryptedKeyForProvider(
  settings: Awaited<ReturnType<typeof ensureAISettings>>,
  provider: AIProvider | string
) {
  switch (provider) {
    case AIProvider.ANTHROPIC:
      return settings.encryptedAnthropicKey || settings.encryptedApiKey;
    case AIProvider.OPENAI:
      return settings.encryptedOpenAIKey || settings.encryptedApiKey;
    case AIProvider.GROK:
      return settings.encryptedGrokKey;
    case AIProvider.GLM:
      return settings.encryptedGlmKey;
    case AIProvider.CUSTOM:
      return settings.encryptedApiKey;
    default:
      return null;
  }
}

export function defaultModelForProvider(provider: AIProvider | string) {
  switch (provider) {
    case AIProvider.ANTHROPIC:
      return "claude-sonnet-4-6";
    case AIProvider.OPENAI:
      return "gpt-4o";
    case AIProvider.GROK:
      return "grok-2-latest";
    case AIProvider.GLM:
      return "glm-4.5";
    default:
      return null;
  }
}

export async function getConfiguredSchedulerAI(userId: string) {
  const settings = await ensureAISettings(userId);
  let oauthToken: string | null = null;
  if (settings.provider === AIProvider.CUSTOM) {
    try {
      oauthToken = await getCustomAIOAuthAccessToken(userId);
    } catch {
      // OAuth is optional. Key-based Custom AI and deterministic scheduling stay
      // available even if an administrator misconfigures its OAuth endpoint.
    }
  }
  const byokKey =
    oauthToken ||
    decryptSecret(getEncryptedKeyForProvider(settings, settings.provider));
  const hostedKey = process.env.NEEDT_AI_API_KEY?.trim() || null;
  const usage = await getHostedAiUsage(userId);
  const source = resolveAiAccessMode({
    hasByok: usage.plan !== "FREE" && Boolean(byokKey),
    hostedAvailable: Boolean(hostedKey),
    hostedAllowed: usage.allowed,
  });
  const config: SchedulerAIConfig =
    source === "hosted"
      ? {
          provider: "OPENAI",
          apiKey: hostedKey,
          baseUrl: HOSTED_AI_CONFIG.baseUrl,
          model: HOSTED_AI_CONFIG.model,
          timeoutMs: settings.requestTimeoutSeconds * 1000,
          soulPreset: settings.soulPreset === "coach" ? "coach" : "business",
        }
      : {
          provider:
            source === "byok" ? (settings.provider as AIProviderName) : "NONE",
          apiKey: byokKey,
          customUrl: settings.customUrl || getDefaultCustomAIUrl(),
          model: settings.model || defaultModelForProvider(settings.provider),
          timeoutMs: settings.requestTimeoutSeconds * 1000,
          soulPreset:
            settings.soulPreset === "coach" ||
            settings.soulPreset === "business"
              ? settings.soulPreset
              : "business",
        };

  return {
    settings,
    ai: createSchedulerAI(config),
    source,
    usage,
  };
}
