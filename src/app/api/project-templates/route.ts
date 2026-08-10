import { NextRequest, NextResponse } from "next/server";

import { wouldCreateDependencyCycle } from "@/services/tasks/dependencies";
import {
  ProjectRelativeDateAnchor,
  ProjectTemplateKind,
  SchedulingEnergyLevel,
  WorkspaceRole,
} from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "project-templates-route";

interface TemplateStageInput {
  key: string;
  name: string;
  color: string | null;
  position: number;
  startOffsetDays: number;
  durationDays: number | null;
}

interface TemplateRoleInput {
  key: string;
  name: string;
  color: string | null;
  position: number;
}

interface TemplateTaskInput {
  key: string;
  stageKey: string | null;
  roleKey: string | null;
  title: string;
  description: string | null;
  position: number;
  estimatedMinutes: number | null;
  priority: string | null;
  energyRequired: SchedulingEnergyLevel;
  startAnchor: ProjectRelativeDateAnchor | null;
  startOffsetDays: number | null;
  deadlineAnchor: ProjectRelativeDateAnchor | null;
  deadlineOffsetDays: number | null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nonNegativeInteger(value: unknown) {
  return Number.isInteger(value) && (value as number) >= 0
    ? (value as number)
    : null;
}

function relativeRule(anchor: unknown, offset: unknown) {
  if (anchor === undefined && offset === undefined) {
    return { anchor: null, offset: null };
  }
  if (
    (anchor !== ProjectRelativeDateAnchor.STAGE_START &&
      anchor !== ProjectRelativeDateAnchor.STAGE_DEADLINE) ||
    !Number.isInteger(offset)
  ) {
    return null;
  }
  return { anchor, offset: offset as number };
}

function parseTemplate(body: Record<string, unknown>) {
  const name = stringValue(body.name);
  const kind =
    body.kind === ProjectTemplateKind.WORKFLOW
      ? ProjectTemplateKind.WORKFLOW
      : ProjectTemplateKind.REGULAR;
  const rawStages = Array.isArray(body.stages) ? body.stages : [];
  const rawRoles = Array.isArray(body.roles) ? body.roles : [];
  const rawTasks = Array.isArray(body.tasks) ? body.tasks : [];
  const rawDependencies = Array.isArray(body.dependencies)
    ? body.dependencies
    : [];
  if (
    !name ||
    rawStages.length > 100 ||
    rawRoles.length > 100 ||
    rawTasks.length > 500
  ) {
    return null;
  }

  const stages: TemplateStageInput[] = [];
  const roles: TemplateRoleInput[] = [];
  const tasks: TemplateTaskInput[] = [];
  const seenStageKeys = new Set<string>();
  const seenRoleKeys = new Set<string>();
  const seenTaskKeys = new Set<string>();

  for (const [index, raw] of rawStages.entries()) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const item = raw as Record<string, unknown>;
    const key = stringValue(item.key) || `stage-${index}`;
    const stageName = stringValue(item.name);
    const durationDays =
      item.durationDays === undefined || item.durationDays === null
        ? null
        : nonNegativeInteger(item.durationDays);
    if (
      !stageName ||
      seenStageKeys.has(key) ||
      (item.durationDays != null && durationDays === null)
    ) {
      return null;
    }
    seenStageKeys.add(key);
    stages.push({
      key,
      name: stageName,
      color: stringValue(item.color) || null,
      position: finiteNumber(item.position, index),
      startOffsetDays: Number.isInteger(item.startOffsetDays)
        ? (item.startOffsetDays as number)
        : 0,
      durationDays,
    });
  }

  for (const [index, raw] of rawRoles.entries()) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const item = raw as Record<string, unknown>;
    const key = stringValue(item.key) || `role-${index}`;
    const roleName = stringValue(item.name);
    if (!roleName || seenRoleKeys.has(key)) return null;
    seenRoleKeys.add(key);
    roles.push({
      key,
      name: roleName,
      color: stringValue(item.color) || null,
      position: finiteNumber(item.position, index),
    });
  }

  for (const [index, raw] of rawTasks.entries()) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const item = raw as Record<string, unknown>;
    const key = stringValue(item.key) || `task-${index}`;
    const title = stringValue(item.title);
    const stageKey = stringValue(item.stageKey) || null;
    const roleKey = stringValue(item.roleKey) || null;
    const startRule = relativeRule(item.startAnchor, item.startOffsetDays);
    const deadlineRule = relativeRule(
      item.deadlineAnchor,
      item.deadlineOffsetDays
    );
    const estimatedMinutes =
      item.estimatedMinutes === undefined || item.estimatedMinutes === null
        ? null
        : nonNegativeInteger(item.estimatedMinutes);
    if (
      !title ||
      seenTaskKeys.has(key) ||
      (stageKey && !seenStageKeys.has(stageKey)) ||
      (roleKey && !seenRoleKeys.has(roleKey)) ||
      !startRule ||
      !deadlineRule ||
      ((startRule.anchor !== null || deadlineRule.anchor !== null) &&
        !stageKey) ||
      (item.estimatedMinutes != null &&
        (estimatedMinutes === null || estimatedMinutes === 0))
    ) {
      return null;
    }
    seenTaskKeys.add(key);
    tasks.push({
      key,
      stageKey,
      roleKey,
      title,
      description: stringValue(item.description) || null,
      position: finiteNumber(item.position, index),
      estimatedMinutes,
      priority: stringValue(item.priority) || null,
      energyRequired: Object.values(SchedulingEnergyLevel).includes(
        item.energyRequired as SchedulingEnergyLevel
      )
        ? (item.energyRequired as SchedulingEnergyLevel)
        : SchedulingEnergyLevel.MEDIUM,
      startAnchor: startRule.anchor,
      startOffsetDays: startRule.offset,
      deadlineAnchor: deadlineRule.anchor,
      deadlineOffsetDays: deadlineRule.offset,
    });
  }

  const dependencies = rawDependencies.flatMap((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const item = raw as Record<string, unknown>;
    const blockerTaskKey = stringValue(item.blockerTaskKey);
    const blockedTaskKey = stringValue(item.blockedTaskKey);
    return blockerTaskKey &&
      blockedTaskKey &&
      blockerTaskKey !== blockedTaskKey &&
      seenTaskKeys.has(blockerTaskKey) &&
      seenTaskKeys.has(blockedTaskKey)
      ? [{ blockerTaskKey, blockedTaskKey }]
      : [];
  });

  if (dependencies.length !== rawDependencies.length) return null;
  const dependencyEdges: Array<{
    blockerTaskId: string;
    blockedTaskId: string;
  }> = [];
  for (const dependency of dependencies) {
    if (
      dependencyEdges.some(
        (edge) =>
          edge.blockerTaskId === dependency.blockerTaskKey &&
          edge.blockedTaskId === dependency.blockedTaskKey
      ) ||
      wouldCreateDependencyCycle(
        dependencyEdges,
        dependency.blockerTaskKey,
        dependency.blockedTaskKey
      )
    ) {
      return null;
    }
    dependencyEdges.push({
      blockerTaskId: dependency.blockerTaskKey,
      blockedTaskId: dependency.blockedTaskKey,
    });
  }
  return { name, kind, stages, roles, tasks, dependencies };
}

const templateInclude = {
  stages: { orderBy: { position: "asc" as const } },
  roles: { orderBy: { position: "asc" as const } },
  tasks: { orderBy: { position: "asc" as const } },
  dependencies: true,
};

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const workspaceId = auth.workspace?.workspaceId;
  if (!workspaceId) {
    return NextResponse.json(
      { error: "Workspace is required" },
      { status: 400 }
    );
  }

  const templates = await prisma.projectTemplate.findMany({
    where: { workspaceId },
    include: templateInclude,
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE, {
      requiredRole: WorkspaceRole.EDITOR,
    });
    if ("response" in auth) return auth.response;

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const input = parseTemplate(body);
    const workspaceId = auth.workspace?.workspaceId;
    if (!input || !workspaceId) {
      return NextResponse.json(
        { error: "Invalid template input" },
        { status: 400 }
      );
    }

    const template = await prisma.$transaction(async (tx) => {
      const created = await tx.projectTemplate.create({
        data: {
          workspaceId,
          createdById: auth.userId,
          name: input.name,
          description: stringValue(body.description) || null,
          color: stringValue(body.color) || null,
          icon: stringValue(body.icon) || null,
          kind: input.kind,
        },
      });
      const stageIds = new Map<string, string>();
      const roleIds = new Map<string, string>();
      const taskIds = new Map<string, string>();

      for (const stage of input.stages) {
        const { key, ...stageData } = stage;
        const row = await tx.projectTemplateStage.create({
          data: { ...stageData, templateId: created.id },
        });
        stageIds.set(key, row.id);
      }
      for (const role of input.roles) {
        const { key, ...roleData } = role;
        const row = await tx.projectTemplateRole.create({
          data: { ...roleData, templateId: created.id },
        });
        roleIds.set(key, row.id);
      }
      for (const task of input.tasks) {
        const row = await tx.projectTemplateTask.create({
          data: {
            templateId: created.id,
            stageId: task.stageKey ? stageIds.get(task.stageKey) : null,
            roleId: task.roleKey ? roleIds.get(task.roleKey) : null,
            title: task.title,
            description: task.description,
            position: task.position,
            estimatedMinutes: task.estimatedMinutes,
            priority: task.priority,
            energyRequired: task.energyRequired,
            startAnchor: task.startAnchor,
            startOffsetDays: task.startOffsetDays,
            deadlineAnchor: task.deadlineAnchor,
            deadlineOffsetDays: task.deadlineOffsetDays,
          },
        });
        taskIds.set(task.key, row.id);
      }
      if (input.dependencies.length > 0) {
        await tx.projectTemplateDependency.createMany({
          data: input.dependencies.map((dependency) => ({
            templateId: created.id,
            blockerTaskId: taskIds.get(dependency.blockerTaskKey)!,
            blockedTaskId: taskIds.get(dependency.blockedTaskKey)!,
          })),
        });
      }
      return tx.projectTemplate.findUniqueOrThrow({
        where: { id: created.id },
        include: templateInclude,
      });
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    logger.error(
      "Failed to create project template",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
