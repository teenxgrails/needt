import { pageBlocksToCollaborationState } from "@/services/pages/page-collaboration-document";
import { PageAccessRole } from "@prisma/client";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { type PageAccessActor, resolvePageAccess } from "@/lib/auth/page-auth";
import { newDate } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_SECONDS = 5 * 60;

export type PageCollaborationClaims = {
  sub: string;
  pageId: string;
  workspaceId: string;
  role: PageAccessRole;
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

export function verifyPageCollaborationToken(token: string) {
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
    ) as Partial<PageCollaborationClaims>;
    const now = Math.floor(newDate().getTime() / 1_000);
    if (
      typeof claims.sub !== "string" ||
      typeof claims.pageId !== "string" ||
      typeof claims.workspaceId !== "string" ||
      !Object.values(PageAccessRole).includes(claims.role as PageAccessRole) ||
      typeof claims.exp !== "number" ||
      claims.exp <= now ||
      typeof claims.jti !== "string"
    ) {
      return null;
    }
    return claims as PageCollaborationClaims;
  } catch {
    return null;
  }
}

async function initialState(pageId: string) {
  const existing = await prisma.pageCollaborationState.findUnique({
    where: { pageId },
    select: { state: true },
  });
  if (existing) return new Uint8Array(existing.state);

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: {
      blocks: { orderBy: { position: "asc" } },
    },
  });
  if (!page) return null;
  const state = pageBlocksToCollaborationState(page.blocks);
  try {
    const created = await prisma.pageCollaborationState.create({
      data: { pageId, state: Buffer.from(state) },
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
    const raced = await prisma.pageCollaborationState.findUnique({
      where: { pageId },
      select: { state: true },
    });
    return raced ? new Uint8Array(raced.state) : null;
  }
}

export async function issuePageCollaborationToken(
  actor: PageAccessActor,
  pageId: string
) {
  const access = await resolvePageAccess(actor, pageId);
  if (!access || !actor.workspace) return null;
  const state = await initialState(pageId);
  if (!state) return null;
  const claims: PageCollaborationClaims = {
    sub: actor.userId,
    pageId,
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
