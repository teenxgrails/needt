import * as Sentry from "@sentry/node";

import { requireProductionBuildSha } from "@/lib/health/build-sha";
import { logger } from "@/lib/logger";
import {
  dropSentryBreadcrumb,
  scrubSentryEvent,
  scrubSentrySpan,
} from "@/lib/sentry/privacy";

import { createCollaborationServer } from "./server";

const LOG_SOURCE = "CollaborationServer";
const buildSha = requireProductionBuildSha();
const server = createCollaborationServer({ buildSha });

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT,
    release: process.env.NEEDT_BUILD_SHA,
    initialScope: { tags: { service: "collaboration" } },
    tracesSampleRate: 0.02,
    sendDefaultPii: false,
    beforeBreadcrumb: dropSentryBreadcrumb,
    beforeSend: scrubSentryEvent,
    beforeSendTransaction: () => null,
    beforeSendSpan: scrubSentrySpan,
  });
}

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
      {
        address: server.webSocketURL,
        buildSha,
      },
      LOG_SOURCE
    )
  )
  .catch(async (error: unknown) => {
    process.exitCode = 1;
    Sentry.captureException(error);
    await logger.error(
      "Collaboration server failed",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    await Sentry.flush(2_000);
  });
