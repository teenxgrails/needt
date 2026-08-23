import * as Sentry from "@sentry/nextjs";

import {
  dropSentryBreadcrumb,
  scrubSentryEvent,
  scrubSentrySpan,
} from "./src/lib/sentry/privacy";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT,
    release: process.env.NEEDT_BUILD_SHA,
    initialScope: { tags: { service: "web" } },
    tracesSampleRate: 0.02,
    sendDefaultPii: false,
    beforeBreadcrumb: dropSentryBreadcrumb,
    beforeSend: scrubSentryEvent,
    beforeSendTransaction: () => null,
    beforeSendSpan: scrubSentrySpan,
  });
}
