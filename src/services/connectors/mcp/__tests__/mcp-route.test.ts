import { NextRequest, NextResponse } from "next/server";

import { DELETE, GET, POST } from "@/app/api/mcp/route";
import {
  authenticateConnectorToken,
  authorizeConnectorWorkspace,
} from "@/services/connectors/auth";
import { CONNECTOR_CONTROL_ACTIONS } from "@/services/connectors/control-actions";
import { MCP_TOOLS } from "@/services/connectors/mcp/tools";
import { WorkspaceKind, WorkspaceRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { enforceRateLimits } from "@/lib/security/rate-limit";

jest.mock("@/services/connectors/auth");
jest.mock("@/services/connectors/webhooks", () => ({
  sendConnectorWebhook: jest.fn(),
}));
jest.mock("@/services/scheduling/TaskSchedulingService", () => ({
  scheduleAllTasksForUser: jest.fn(),
}));
jest.mock("@/lib/task-block-push", () => ({
  schedulePushTaskBlock: jest.fn(),
}));
jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));
jest.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimits: jest.fn(),
  ipRule: jest.fn(() => ({ namespace: "ip" })),
  accountRule: jest.fn(() => ({ namespace: "user" })),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    habit: { findMany: jest.fn() },
    scheduledBlock: { deleteMany: jest.fn() },
  },
}));

const workspace = {
  enabled: true,
  workspaceId: "workspace-1",
  workspaceKind: WorkspaceKind.SHARED,
  role: WorkspaceRole.EDITOR,
  dataScope: { mode: "workspace" as const, workspaceId: "workspace-1" },
};

function rpc(
  body: unknown,
  headers: Record<string, string> = { authorization: "Bearer good-token" }
) {
  return new NextRequest("http://localhost/api/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function call(
  name: string,
  args: Record<string, unknown>,
  headers?: Record<string, string>
) {
  return POST(
    rpc(
      {
        jsonrpc: "2.0",
        id: 7,
        method: "tools/call",
        params: { name, arguments: args },
      },
      headers
    )
  );
}

describe("remote MCP endpoint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(authenticateConnectorToken)
      .mockImplementation(async (header) =>
        header === "Bearer good-token" ? "user-1" : null
      );
    jest
      .mocked(authorizeConnectorWorkspace)
      .mockResolvedValue({ userId: "user-1", workspace });
    jest.mocked(enforceRateLimits).mockResolvedValue(null);
  });

  it("initializes and lists the single tool catalogue", async () => {
    const init = await POST(
      rpc({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-03-26", capabilities: {} },
      })
    );
    const initBody = await init.json();
    expect(initBody.result.protocolVersion).toBe("2025-03-26");
    expect(initBody.result.capabilities.tools).toBeDefined();

    const notified = await POST(
      rpc({ jsonrpc: "2.0", method: "notifications/initialized" })
    );
    expect(notified.status).toBe(202);

    const list = await POST(
      rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" })
    );
    const { result } = await list.json();
    expect(result.tools.map((tool: { name: string }) => tool.name)).toEqual(
      MCP_TOOLS.map((tool) => tool.name)
    );
    for (const tool of result.tools) {
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  it("rejects a missing or wrong token with a resource-metadata challenge", async () => {
    const missing = await POST(
      rpc({ jsonrpc: "2.0", id: 1, method: "ping" }, {})
    );
    expect(missing.status).toBe(401);
    expect(missing.headers.get("www-authenticate")).toContain(
      'resource_metadata="'
    );
    expect(missing.headers.get("www-authenticate")).toContain(
      "/.well-known/oauth-protected-resource"
    );

    const wrong = await POST(
      rpc(
        { jsonrpc: "2.0", id: 1, method: "ping" },
        { authorization: "Bearer nope" }
      )
    );
    expect(wrong.status).toBe(401);
    expect(enforceRateLimits).not.toHaveBeenCalled();
  });

  it("returns 429 when the rate limiter refuses", async () => {
    jest
      .mocked(enforceRateLimits)
      .mockResolvedValue(NextResponse.json({ error: "slow" }, { status: 429 }));
    const response = await POST(rpc({ jsonrpc: "2.0", id: 1, method: "ping" }));
    expect(response.status).toBe(429);
    expect(enforceRateLimits).toHaveBeenCalledWith(
      [{ namespace: "ip" }, { namespace: "user" }],
      { route: "/api/mcp", userId: "user-1" }
    );
  });

  it("answers GET and DELETE with 405", async () => {
    expect((await GET()).status).toBe(405);
    expect((await DELETE()).status).toBe(405);
  });

  it("forwards needt_control to the control route with the caller's auth and workspace", async () => {
    (prisma.task.findMany as jest.Mock).mockResolvedValue([]);
    const response = await call(
      "needt_control",
      { action: "complete_task" },
      { authorization: "Bearer good-token", "x-workspace-id": "workspace-1" }
    );
    const body = await response.json();
    // complete_task without an id is refused by the route itself.
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain("id is required");

    const tokenCalls = jest.mocked(authenticateConnectorToken).mock.calls;
    expect(tokenCalls).toEqual([["Bearer good-token"], ["Bearer good-token"]]);
    const forwarded = jest.mocked(authorizeConnectorWorkspace).mock.calls[0][0];
    expect(forwarded.nextUrl.pathname).toBe("/api/connect/control");
    expect(forwarded.headers.get("x-workspace-id")).toBe("workspace-1");
  });

  it("returns a tool error, not a 500, for a delete without confirm", async () => {
    (prisma.task.findFirst as jest.Mock).mockResolvedValue({
      id: "task-1",
      title: "Ship release",
      assigneeId: "user-1",
      workspaceId: "workspace-1",
    });
    const response = await call("needt_control", {
      action: "delete_task",
      id: "task-1",
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain("confirm");
    expect(prisma.task.update).not.toHaveBeenCalled();
  });

  it("derives the needt_control action enum from the route's action list", async () => {
    const list = await POST(
      rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" })
    );
    const { result } = await list.json();
    const control = result.tools.find(
      (tool: { name: string }) => tool.name === "needt_control"
    );
    expect(control.inputSchema.properties.action.enum).toEqual([
      ...CONNECTOR_CONTROL_ACTIONS,
    ]);
    expect(control.inputSchema.properties.action.enum).toEqual(
      expect.arrayContaining(["restore_task", "restore_calendar"])
    );
  });

  it("scopes needt_list to the caller's workspace and caps the limit", async () => {
    (prisma.task.findMany as jest.Mock).mockResolvedValue([
      { id: "task-1", title: "Mine", workspaceId: "workspace-1" },
    ]);
    const response = await call("needt_list", { type: "task", limit: 10 });
    const body = await response.json();
    expect(JSON.parse(body.result.content[0].text).items).toEqual([
      { id: "task-1", title: "Mine", workspaceId: "workspace-1" },
    ]);
    const args = (prisma.task.findMany as jest.Mock).mock.calls[0][0];
    expect(args.where).toMatchObject({ workspaceId: "workspace-1" });
    expect(args.take).toBe(11);

    (prisma.habit.findMany as jest.Mock).mockResolvedValue([]);
    await call("needt_list", { type: "habit" });
    expect(
      (prisma.habit.findMany as jest.Mock).mock.calls[0][0].where
    ).toMatchObject({ workspaceId: "workspace-1", userId: "user-1" });

    const tooMany = await call("needt_list", { type: "task", limit: 500 });
    const tooManyBody = await tooMany.json();
    expect(tooManyBody.result.isError).toBe(true);
  });

  it("returns a tool error for unreadable workspaces instead of listing", async () => {
    jest.mocked(authorizeConnectorWorkspace).mockResolvedValue({
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });
    const response = await call("needt_list", { type: "task" });
    const body = await response.json();
    expect(body.result.isError).toBe(true);
    expect(prisma.task.findMany).not.toHaveBeenCalled();
  });
});
