import { logger } from "@/lib/logger";

const LOG_SOURCE = "WorkspaceProvider";

export async function reportWorkspaceBootstrapFailure(error: unknown) {
  try {
    await logger.error(
      "Initial workspace request failed",
      { errorType: error instanceof Error ? error.name : "UnknownError" },
      LOG_SOURCE
    );
  } catch {
    // Logging must not turn a recoverable workspace request failure into one.
  }
}
