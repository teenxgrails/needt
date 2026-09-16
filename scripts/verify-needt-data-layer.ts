import { TaskStage, WorkspaceKind, WorkspaceRole } from "@prisma/client";
import assert from "node:assert/strict";

import type { WorkspaceAccess } from "@/lib/auth/workspace-auth";
import { newDateFromYMD } from "@/lib/date-utils";
import { prismaDataSource } from "@/lib/needt/prisma-source";
import { prisma } from "@/lib/prisma";

const USER_ID = "needt-phase2-verification-user";
const WORKSPACE_ID = "needt-phase2-verification-workspace";
const PROJECT_ID = "needt-phase2-verification-project";
const TASK_IDS = [
  "needt-phase2-verification-task-a",
  "needt-phase2-verification-task-b",
] as const;

function requireLocalDatabase(value: string | undefined, variable: string) {
  assert(value, `${variable} is required`);
  const url = new URL(value);
  assert(
    url.hostname === "127.0.0.1" || url.hostname === "localhost",
    `${variable} must target loopback`
  );
  assert.equal(url.port, "5432", `${variable} must target port 5432`);
  assert.equal(
    url.pathname,
    "/fluid_calendar",
    `${variable} must target fluid_calendar`
  );
  return `${url.hostname}:${url.port}${url.pathname}`;
}

async function cleanup() {
  await prisma.task.deleteMany({ where: { id: { in: [...TASK_IDS] } } });
  await prisma.project.deleteMany({ where: { id: PROJECT_ID } });
  await prisma.workspaceMember.deleteMany({
    where: { workspaceId: WORKSPACE_ID },
  });
  await prisma.workspace.deleteMany({ where: { id: WORKSPACE_ID } });
  await prisma.user.deleteMany({ where: { id: USER_ID } });
}

async function main() {
  const database = requireLocalDatabase(
    process.env.DATABASE_URL,
    "DATABASE_URL"
  );
  const direct = requireLocalDatabase(process.env.DIRECT_URL, "DIRECT_URL");
  assert.equal(direct, database, "DATABASE_URL and DIRECT_URL must match");

  await cleanup();
  try {
    await prisma.user.create({
      data: {
        id: USER_ID,
        email: "needt-phase2-verification@example.test",
        name: "Needt verification",
        initials: "NV",
        hue: "#3366ff",
      },
    });
    await prisma.workspace.create({
      data: {
        id: WORKSPACE_ID,
        name: "Needt verification",
        kind: WorkspaceKind.PERSONAL,
        personalOwnerId: USER_ID,
        members: {
          create: { userId: USER_ID, role: WorkspaceRole.OWNER },
        },
      },
    });
    await prisma.project.create({
      data: {
        id: PROJECT_ID,
        name: "Verification project",
        color: "#ff6600",
        icon: "circle",
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
      },
    });
    await prisma.task.create({
      data: {
        id: TASK_IDS[0],
        title: "Open the launch brief",
        status: "todo",
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
        projectId: PROJECT_ID,
        assigneeId: USER_ID,
        entry: "Open the brief",
        estimatedMinutes: 25,
        noSlot: true,
        valueCents: 160_050,
        earnedCents: 80_000,
        globalStage: TaskStage.DOING,
      },
    });
    await prisma.task.create({
      data: {
        id: TASK_IDS[1],
        title: "Send the launch brief",
        status: "in_progress",
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
        projectId: PROJECT_ID,
        dependsOnId: TASK_IDS[0],
        parts: {
          create: [{ title: "Attach the PDF", done: true, position: 0 }],
        },
        waits: {
          create: {
            waitingOnUserId: USER_ID,
            reason: "approval",
          },
        },
      },
    });

    const workspace: WorkspaceAccess = {
      enabled: true,
      workspaceId: WORKSPACE_ID,
      workspaceKind: WorkspaceKind.PERSONAL,
      role: WorkspaceRole.OWNER,
      dataScope: { mode: "workspace", workspaceId: WORKSPACE_ID },
    };
    const source = prismaDataSource(USER_ID, workspace, () =>
      newDateFromYMD(2026, 8, 16)
    );
    const tasks = await source.getTasks();
    const people = await source.getPeople();
    const byId = new Map(tasks.map((task) => [task.id, task]));

    assert.equal(tasks.length, 2);
    assert.equal(byId.get(TASK_IDS[0])?.id, TASK_IDS[0]);
    assert.equal(byId.get(TASK_IDS[0])?.project, "Verification project");
    assert.equal(byId.get(TASK_IDS[0])?.holder, USER_ID);
    assert.equal(byId.get(TASK_IDS[0])?.entry, "Open the brief");
    assert.equal(byId.get(TASK_IDS[0])?.value, 1600.5);
    assert.equal(byId.get(TASK_IDS[0])?.earned, 800);
    assert.equal(byId.get(TASK_IDS[0])?.noSlot, true);
    assert.equal(byId.get(TASK_IDS[0])?.stage, "doing");
    assert.equal(byId.get(TASK_IDS[1])?.blockedBy, TASK_IDS[0]);
    assert.deepEqual(byId.get(TASK_IDS[1])?.parts, [
      { title: "Attach the PDF", done: true },
    ]);
    assert.deepEqual(byId.get(TASK_IDS[1])?.waitsOn, {
      on: USER_ID,
      for: "approval",
    });
    assert.deepEqual(
      people.map(({ id }) => id),
      [USER_ID]
    );

    process.stdout.write(
      `Verified ${tasks.length} tasks through prismaDataSource at ${database}\n`
    );
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
}

void main();
