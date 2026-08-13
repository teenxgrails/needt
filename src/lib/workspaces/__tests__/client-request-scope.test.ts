import { scopeWorkspaceRequest } from "@/lib/workspaces/client-request-scope";

describe("scopeWorkspaceRequest", () => {
  beforeEach(() => {
    Object.defineProperty(global, "window", {
      configurable: true,
      value: { location: { origin: "https://needt.test" } },
    });
  });

  it("adds the active workspace only to same-origin workspace APIs", () => {
    const [input, init] = scopeWorkspaceRequest(
      "/api/tasks",
      { method: "GET" },
      "workspace-shared"
    );

    expect(input).toBe("/api/tasks");
    expect(new Headers(init?.headers).get("x-workspace-id")).toBe(
      "workspace-shared"
    );
  });

  it("preserves an explicit workspace and skips account-global APIs", () => {
    const [, explicit] = scopeWorkspaceRequest(
      "/api/tasks",
      { headers: { "x-workspace-id": "workspace-explicit" } },
      "workspace-active"
    );
    const [, auth] = scopeWorkspaceRequest(
      "/api/auth/session",
      undefined,
      "workspace-active"
    );
    const [, memberships] = scopeWorkspaceRequest(
      "/api/workspaces",
      undefined,
      "workspace-active"
    );

    expect(new Headers(explicit?.headers).get("x-workspace-id")).toBe(
      "workspace-explicit"
    );
    expect(auth).toBeUndefined();
    expect(memberships).toBeUndefined();
  });
});
