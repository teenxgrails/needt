import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "global-search";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ results: [] });

  const [tasks, projects, events] = await Promise.all([
    prisma.task.findMany({
      where: {
        userId: auth.userId,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 6,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.project.findMany({
      where: {
        userId: auth.userId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 6,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.calendarEvent.findMany({
      where: {
        feed: { userId: auth.userId },
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 6,
      orderBy: { start: "desc" },
    }),
  ]);

  return NextResponse.json({
    results: [
      ...tasks.map((task) => ({
        id: task.id,
        type: "Task",
        title: task.title,
        href: "/tasks",
      })),
      ...projects.map((project) => ({
        id: project.id,
        type: "Project",
        title: project.name,
        href: "/tasks",
      })),
      ...events.map((event) => ({
        id: event.id,
        type: "Event",
        title: event.title,
        href: "/calendar",
      })),
    ],
  });
}
