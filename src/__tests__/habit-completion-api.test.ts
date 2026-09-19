import { NextRequest, NextResponse } from "next/server";

import { DELETE, PUT } from "@/app/api/habits/[id]/completions/today/route";
import { setHabitCompletionToday } from "@/services/habits/habit-service";
import { WorkspaceKind, WorkspaceRole } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/api-auth";

jest.mock("@/lib/auth/api-auth");
jest.mock("@/services/habits/habit-service");

const workspace = {
  enabled: true,
  workspaceId: "workspace-1",
  workspaceKind: WorkspaceKind.SHARED,
  role: WorkspaceRole.EDITOR,
  dataScope: { mode: "workspace" as const, workspaceId: "workspace-1" },
};
const context = { params: Promise.resolve({ id: "habit-1" }) };

describe("habit completion API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authenticateRequest).mockResolvedValue({
      userId: "user-1",
      workspace,
    });
    jest.mocked(setHabitCompletionToday).mockResolvedValue({
      habitId: "habit-1",
      date: "2026-09-19",
      completed: true,
    });
  });

  it("requires Editor and records today's completion without client input", async () => {
    const request = new NextRequest(
      "http://localhost/api/habits/habit-1/completions/today",
      { method: "PUT" }
    );
    const response = (await PUT(request, context))!;

    expect(authenticateRequest).toHaveBeenCalledWith(
      request,
      "HabitCompletionAPI",
      { requiredRole: WorkspaceRole.EDITOR }
    );
    expect(setHabitCompletionToday).toHaveBeenCalledWith({
      userId: "user-1",
      workspace,
      habitId: "habit-1",
      completed: true,
    });
    expect(response.status).toBe(200);
  });

  it("uses the same idempotent service for undo", async () => {
    await DELETE(
      new NextRequest("http://localhost/api/habits/habit-1/completions/today", {
        method: "DELETE",
      }),
      context
    );
    expect(setHabitCompletionToday).toHaveBeenCalledWith(
      expect.objectContaining({ completed: false })
    );
  });

  it("does not call the service when authorization fails", async () => {
    jest.mocked(authenticateRequest).mockResolvedValue({
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });
    const response = (await PUT(
      new NextRequest("http://localhost/api/habits/habit-1/completions/today", {
        method: "PUT",
      }),
      context
    ))!;
    expect(response.status).toBe(403);
    expect(setHabitCompletionToday).not.toHaveBeenCalled();
  });

  it("returns the same 404 for every unavailable habit", async () => {
    jest.mocked(setHabitCompletionToday).mockResolvedValue(null);
    const response = (await PUT(
      new NextRequest("http://localhost/api/habits/missing/completions/today", {
        method: "PUT",
      }),
      { params: Promise.resolve({ id: "missing" }) }
    ))!;
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Habit not found" });
  });
});
