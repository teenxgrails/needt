import { logger } from "@/lib/logger";

import {
  loadWorkspaceStores,
  reportWorkspaceBootstrapFailure,
} from "../workspace-bootstrap";

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn() },
}));

describe("workspace bootstrap failure reporting", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("records only the error type and resolves even when logging fails", async () => {
    jest
      .mocked(logger.error)
      .mockRejectedValue(new Error("logger unavailable"));

    await expect(
      reportWorkspaceBootstrapFailure(new TypeError("Load failed"))
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      "Initial workspace request failed",
      { errorType: "TypeError" },
      "WorkspaceProvider"
    );
  });

  it("loads task, tag, and project stores as one workspace snapshot", async () => {
    const response = (body: unknown) =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(body),
      } as Response);
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementationOnce(() => response([{ id: "task-1" }]))
      .mockImplementationOnce(() => response([{ id: "tag-1" }]))
      .mockImplementationOnce(() => response([{ id: "project-1" }]));

    await expect(loadWorkspaceStores()).resolves.toEqual({
      tasks: [{ id: "task-1" }],
      tags: [{ id: "tag-1" }],
      projects: [{ id: "project-1" }],
    });
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      "/api/tasks",
      "/api/tags",
      "/api/projects",
    ]);
  });
});
