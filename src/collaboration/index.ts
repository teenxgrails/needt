import { logger } from "@/lib/logger";

import { createCollaborationServer } from "./server";

const LOG_SOURCE = "CollaborationServer";
const server = createCollaborationServer();

async function shutdown(signal: string) {
  await logger.info("Stopping collaboration server", { signal }, LOG_SOURCE);
  await server.destroy();
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

void server
  .listen()
  .then(() =>
    logger.info(
      "Collaboration server started",
      { address: server.webSocketURL },
      LOG_SOURCE
    )
  )
  .catch((error: unknown) =>
    logger.error(
      "Collaboration server failed",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    )
  );
