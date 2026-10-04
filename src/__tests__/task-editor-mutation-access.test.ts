import { NextRequest, NextResponse } from "next/server";

import {
  DELETE as deleteTag,
  PUT as updateTag,
} from "@/app/api/tags/[id]/route";
import { POST as createTag } from "@/app/api/tags/route";
import {
  POST as addDependency,
  DELETE as deleteDependency,
} from "@/app/api/tasks/[id]/dependencies/route";
import {
  POST as addReminder,
  DELETE as deleteReminder,
} from "@/app/api/tasks/[id]/reminders/route";
import { POST as startNow } from "@/app/api/tasks/[id]/start-now/route";
import { POST as trackTime } from "@/app/api/time-tracking/route";
import { WorkspaceRole } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/api-auth";

jest.mock("@/lib/auth/api-auth");
jest.mock("@/lib/prisma", () => ({ prisma: {} }));

const context = { params: Promise.resolve({ id: "task-1" }) };
type MutationCase = [
  name: string,
  source: string,
  call: (request: NextRequest) => Promise<Response | undefined>,
];

const mutationCases: MutationCase[] = [
  [
    "add dependency",
    "task-dependencies-route",
    (request) => addDependency(request, context),
  ],
  ["delete dependency", "task-dependencies-route", deleteDependency],
  [
    "add reminder",
    "task-reminders-route",
    (request) => addReminder(request, context),
  ],
  ["delete reminder", "task-reminders-route", deleteReminder],
  ["start now", "StartTaskNowAPI", (request) => startNow(request, context)],
  ["track time", "time-tracking-route", trackTime],
  ["create tag", "tags-route", createTag],
  ["update tag", "tag-route", (request) => updateTag(request, context)],
  ["delete tag", "tag-route", (request) => deleteTag(request, context)],
];

describe("task editor mutation access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authenticateRequest).mockResolvedValue({
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });
  });

  it.each(mutationCases)(
    "requires Editor before %s",
    async (_, source, call) => {
      const request = new NextRequest("http://localhost/api/mutation", {
        method: "POST",
        body: "{}",
      });
      const response = await call(request);

      expect(response?.status).toBe(403);
      expect(authenticateRequest).toHaveBeenCalledWith(request, source, {
        requiredRole: WorkspaceRole.EDITOR,
      });
    }
  );
});
