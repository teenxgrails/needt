import {
  authenticateMoodboardCollaboration,
  moodboardIdFromCollaborationDocument,
} from "@/services/moodboards/moodboard-collaboration-auth";
import {
  readMoodboardScene,
  writeMoodboardScene,
} from "@/services/moodboards/moodboard-document";
import {
  authenticatePageCollaboration,
  pageIdFromCollaborationDocument,
} from "@/services/pages/page-collaboration-auth";
import { collaborationDocumentToPageBlocks } from "@/services/pages/page-collaboration-document";
import { replacePageBlocks } from "@/services/pages/page-service";
import { Redis as RedisExtension } from "@hocuspocus/extension-redis";
import { Server } from "@hocuspocus/server";
import { PageAuthor, Prisma } from "@prisma/client";
import * as Y from "yjs";

import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import {
  type CollaborationContext,
  isCollaborationReadOnly,
} from "./access-policy";

const LOG_SOURCE = "CollaborationServer";
const MOODBOARD_SNAPSHOT_INTERVAL_MS = 5 * 60 * 1_000;

function redisExtensions() {
  if (!process.env.REDIS_URL) return [];
  const redisUrl = new URL(process.env.REDIS_URL);
  return [
    new RedisExtension({
      host: redisUrl.hostname,
      port: Number(redisUrl.port || 6379),
      options: {
        db: Number(redisUrl.pathname.slice(1) || 0),
        password: redisUrl.password
          ? decodeURIComponent(redisUrl.password)
          : undefined,
        username: redisUrl.username
          ? decodeURIComponent(redisUrl.username)
          : undefined,
        tls: redisUrl.protocol === "rediss:" ? {} : undefined,
      },
    }),
  ];
}

const server = new Server<CollaborationContext>({
  address: process.env.COLLABORATION_HOST ?? "0.0.0.0",
  port: Number(process.env.COLLABORATION_PORT ?? 1234),
  quiet: true,
  stopOnSignals: false,
  debounce: 1_500,
  maxDebounce: 10_000,
  timeout: 15_000,
  websocketOptions: { maxPayload: 2 * 1024 * 1024 },
  extensions: redisExtensions(),
  async onAuthenticate({ token, documentName, connectionConfig }) {
    const context = documentName.startsWith("moodboard:")
      ? await authenticateMoodboardCollaboration(token, documentName)
      : await authenticatePageCollaboration(token, documentName);
    connectionConfig.readOnly = isCollaborationReadOnly(context);
    return context;
  },
  async onLoadDocument({ document, documentName }) {
    const moodboardId = moodboardIdFromCollaborationDocument(documentName);
    if (moodboardId) {
      const stored = await prisma.moodboardCollaborationState.findUnique({
        where: { moodboardId },
        select: { state: true },
      });
      if (!stored) {
        throw new Error("Moodboard collaboration state is unavailable");
      }
      Y.applyUpdate(document, new Uint8Array(stored.state));
      writeMoodboardScene(document, readMoodboardScene(document));
      return document;
    }
    const pageId = pageIdFromCollaborationDocument(documentName);
    if (!pageId) throw new Error("Invalid Page document name");
    const stored = await prisma.pageCollaborationState.findUnique({
      where: { pageId },
      select: { state: true },
    });
    if (!stored) throw new Error("Page collaboration state is unavailable");
    Y.applyUpdate(document, new Uint8Array(stored.state));
    return document;
  },
  async onStoreDocument({ document, documentName, lastContext }) {
    const moodboardId = moodboardIdFromCollaborationDocument(documentName);
    if (moodboardId) {
      const state = Y.encodeStateAsUpdate(document);
      const now = newDate();
      const existing = await prisma.moodboardCollaborationState.findUnique({
        where: { moodboardId },
        select: { lastSnapshotAt: true },
      });
      const shouldSnapshot =
        !existing?.lastSnapshotAt ||
        now.getTime() - existing.lastSnapshotAt.getTime() >=
          MOODBOARD_SNAPSHOT_INTERVAL_MS;
      const scene = shouldSnapshot ? readMoodboardScene(document) : null;
      await prisma.$transaction(async (transaction) => {
        await transaction.moodboardCollaborationState.upsert({
          where: { moodboardId },
          create: {
            moodboardId,
            state: Buffer.from(state),
            ...(shouldSnapshot && { lastSnapshotAt: now }),
          },
          update: {
            state: Buffer.from(state),
            ...(shouldSnapshot && { lastSnapshotAt: now }),
          },
        });
        if (scene) {
          await transaction.moodboardSnapshot.create({
            data: {
              moodboardId,
              scene: scene as Prisma.InputJsonValue,
            },
          });
        }
      });
      return;
    }
    const pageId = pageIdFromCollaborationDocument(documentName);
    if (!pageId) throw new Error("Invalid Page document name");
    const state = Y.encodeStateAsUpdate(document);
    await prisma.pageCollaborationState.upsert({
      where: { pageId },
      create: { pageId, state: Buffer.from(state) },
      update: { state: Buffer.from(state) },
    });
    const page = await prisma.page.findUnique({
      where: { id: pageId },
      select: { userId: true, documentFormatVersion: true },
    });
    if (!page) return;
    await replacePageBlocks(
      lastContext?.resource === "page" ? lastContext.actor : page.userId,
      pageId,
      collaborationDocumentToPageBlocks(document),
      PageAuthor.HUMAN,
      page.documentFormatVersion === 2 ? 2 : 1,
      { syncCollaborationState: false }
    );
  },
});

async function shutdown(signal: string) {
  await logger.info(
    "Stopping Page collaboration server",
    { signal },
    LOG_SOURCE
  );
  await server.destroy();
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

void server
  .listen()
  .then(() =>
    logger.info(
      "Page collaboration server started",
      { address: server.webSocketURL },
      LOG_SOURCE
    )
  )
  .catch((error: unknown) =>
    logger.error(
      "Page collaboration server failed",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    )
  );
