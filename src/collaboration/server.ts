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
import { type Connection, Server } from "@hocuspocus/server";
import { PageAuthor, Prisma } from "@prisma/client";

import { Yjs as Y } from "@/lib/collaboration/yjs";
import { newDate } from "@/lib/date-utils";
import { isBuildShaAllowed, resolveBuildSha } from "@/lib/health/build-sha";
import { prisma } from "@/lib/prisma";

import {
  type CollaborationContext,
  isCollaborationReadOnly,
  reauthorizeCollaboration,
} from "./access-policy";

const MOODBOARD_SNAPSHOT_INTERVAL_MS = 5 * 60 * 1_000;
const DEFAULT_AUTHORIZATION_RECHECK_INTERVAL_MS = 15_000;
const ACCESS_REVOKED = {
  code: 4403,
  reason: "Collaboration access revoked",
} as const;

export type CollaborationServerOptions = {
  address?: string;
  port?: number;
  useRedis?: boolean;
  authorizationRecheckIntervalMs?: number;
  buildSha?: string;
};

class CollaborationAuthorizationError extends Error {
  readonly code = ACCESS_REVOKED.code;
  readonly reason = ACCESS_REVOKED.reason;

  constructor() {
    super(ACCESS_REVOKED.reason);
    this.name = "CollaborationAuthorizationError";
  }
}

function redisExtensions(enabled: boolean) {
  if (!enabled || !process.env.REDIS_URL) return [];
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

function authenticateCollaboration(token: string, documentName: string) {
  return documentName.startsWith("moodboard:")
    ? authenticateMoodboardCollaboration(token, documentName)
    : authenticatePageCollaboration(token, documentName);
}

async function refreshConnectionAuthorization(
  connection: Connection<CollaborationContext>,
  documentName: string
) {
  try {
    const context = await reauthorizeCollaboration(
      connection.context,
      documentName
    );
    connection.context = context;
    connection.readOnly = isCollaborationReadOnly(context);
    return context;
  } catch {
    throw new CollaborationAuthorizationError();
  }
}

export function createCollaborationServer(
  options: CollaborationServerOptions = {}
) {
  const recheckInterval =
    options.authorizationRecheckIntervalMs ??
    DEFAULT_AUTHORIZATION_RECHECK_INTERVAL_MS;
  const buildSha = options.buildSha ?? resolveBuildSha();
  const recheckTimers = new Map<string, ReturnType<typeof setTimeout>>();

  function cancelRecheck(socketId: string) {
    const timer = recheckTimers.get(socketId);
    if (timer) clearTimeout(timer);
    recheckTimers.delete(socketId);
  }

  function scheduleRecheck(
    socketId: string,
    documentName: string,
    connection: Connection<CollaborationContext>
  ) {
    if (recheckInterval <= 0) return;
    cancelRecheck(socketId);
    const timer = setTimeout(() => {
      recheckTimers.delete(socketId);
      void refreshConnectionAuthorization(connection, documentName)
        .then(() => {
          if (connection.document.hasConnection(connection)) {
            scheduleRecheck(socketId, documentName, connection);
          }
        })
        .catch(() => connection.close(ACCESS_REVOKED));
    }, recheckInterval);
    timer.unref();
    recheckTimers.set(socketId, timer);
  }

  return new Server<CollaborationContext>({
    address: options.address ?? process.env.COLLABORATION_HOST ?? "0.0.0.0",
    port: options.port ?? Number(process.env.COLLABORATION_PORT ?? 1234),
    quiet: true,
    stopOnSignals: false,
    debounce: 1_500,
    maxDebounce: 10_000,
    timeout: 15_000,
    websocketOptions: { maxPayload: 2 * 1024 * 1024 },
    extensions: redisExtensions(options.useRedis ?? true),
    async onRequest({ request, response }) {
      if (request.url?.split("?", 1)[0] !== "/health") return;
      const ok = isBuildShaAllowed(buildSha);
      response.writeHead(ok ? 200 : 503, {
        "Content-Type": "application/json",
      });
      response.end(
        JSON.stringify({
          ok,
          service: "collaboration",
          buildSha,
        })
      );
      return Promise.reject();
    },
    async onAuthenticate({ token, documentName, connectionConfig }) {
      const context = await authenticateCollaboration(token, documentName);
      connectionConfig.readOnly = isCollaborationReadOnly(context);
      return context;
    },
    async onTokenSync({ token, documentName, connection }) {
      try {
        const context = await authenticateCollaboration(token, documentName);
        connection.context = context;
        connection.readOnly = isCollaborationReadOnly(context);
        return context;
      } catch {
        throw new CollaborationAuthorizationError();
      }
    },
    async connected({ socketId, documentName, connection }) {
      scheduleRecheck(socketId, documentName, connection);
    },
    async beforeHandleMessage({ connection, documentName }) {
      await refreshConnectionAuthorization(connection, documentName);
    },
    async onDisconnect({ socketId }) {
      cancelRecheck(socketId);
    },
    async onDestroy() {
      for (const socketId of recheckTimers.keys()) cancelRecheck(socketId);
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
}
