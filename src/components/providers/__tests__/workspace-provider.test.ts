import { logger } from "@/lib/logger";

import { reportWorkspaceBootstrapFailure } from "../workspace-bootstrap";

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn() },
}));

describe("workspace bootstrap failure reporting", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("records only the error type and resolves even when logging fails", async () => {
    jest.mocked(logger.error).mockRejectedValue(new Error("logger unavailable"));

    await expect(
      reportWorkspaceBootstrapFailure(new TypeError("Load failed"))
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      "Initial workspace request failed",
      { errorType: "TypeError" },
      "WorkspaceProvider"
    );
  });
});
