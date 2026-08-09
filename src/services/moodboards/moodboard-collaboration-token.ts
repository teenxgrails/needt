import {
  EMPTY_MOODBOARD_SCENE,
  writeMoodboardScene,
} from "@/services/moodboards/moodboard-document";
import { MoodboardAccessRole } from "@prisma/client";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import {
  type MoodboardAccessActor,
  resolveMoodboardAccess,
} from "@/lib/auth/moodboard-auth";
import { Yjs as Y } from "@/lib/collaboration/yjs";
import { newDate } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_SECONDS = 5 * 60;

export type MoodboardCollaborationClaims = {
  resource: "moodboard";
  sub: string;
  moodboardId: string;
  workspaceId: string;
  role: MoodboardAccessRole;
  exp: number;
  jti: string;
};

function secret() {
  const value = process.env.COLLABORATION_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("COLLABORATION_SECRET is required");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function verifyMoodboardCollaborationToken(token: string) {
  const [payload, candidate] = token.split(".");
  if (!payload || !candidate) return null;
  const expected = signature(payload);
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  if (
    candidateBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(candidateBuffer, expectedBuffer)
  ) {
    return null;
  }
  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as Partial<MoodboardCollaborationClaims>;
    const now = Math.floor(newDate().getTime() / 1_000);
    if (
      claims.resource !== "moodboard" ||
      typeof claims.sub !== "string" ||
      typeof claims.moodboardId !== "string" ||
      typeof claims.workspaceId !== "string" ||
      !Object.values(MoodboardAccessRole).includes(
        claims.role as MoodboardAccessRole
      ) ||
      typeof claims.exp !== "number" ||
      claims.exp <= now ||
      typeof claims.jti !== "string"
    ) {
      return null;
    }
    return claims as MoodboardCollaborationClaims;
  } catch {
    return null;
  }
}

async function initialState(moodboardId: string) {
  const existing = await prisma.moodboardCollaborationState.findUnique({
    where: { moodboardId },
    select: { state: true },
  });
  if (existing) return new Uint8Array(existing.state);

  const document = new Y.Doc();
  writeMoodboardScene(document, EMPTY_MOODBOARD_SCENE);
  const state = Y.encodeStateAsUpdate(document);
  document.destroy();
  try {
    const created = await prisma.moodboardCollaborationState.create({
      data: { moodboardId, state: Buffer.from(state) },
      select: { state: true },
    });
    return new Uint8Array(created.state);
  } catch (error) {
    if (
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== "P2002"
    ) {
      throw error;
    }
    const raced = await prisma.moodboardCollaborationState.findUnique({
      where: { moodboardId },
      select: { state: true },
    });
    return raced ? new Uint8Array(raced.state) : null;
  }
}

export async function issueMoodboardCollaborationToken(
  actor: MoodboardAccessActor,
  moodboardId: string
) {
  const access = await resolveMoodboardAccess(actor, moodboardId);
  if (!access || !actor.workspace) return null;
  const state = await initialState(moodboardId);
  if (!state) return null;
  const claims: MoodboardCollaborationClaims = {
    resource: "moodboard",
    sub: actor.userId,
    moodboardId,
    workspaceId: actor.workspace.workspaceId,
    role: access.role,
    exp: Math.floor(newDate().getTime() / 1_000) + TOKEN_TTL_SECONDS,
    jti: randomBytes(12).toString("hex"),
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return {
    token: `${payload}.${signature(payload)}`,
    expiresAt: claims.exp * 1_000,
    role: access.role,
    initialState: Buffer.from(state).toString("base64"),
  };
}
