import * as Sentry from "@sentry/nextjs";

import {
  dropSentryBreadcrumb,
  scrubSentryEvent,
  scrubSentrySpan,
} from "./src/lib/sentry/privacy";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    release: process.env.NEXT_PUBLIC_NEEDT_BUILD_SHA,
    initialScope: { tags: { service: "web" } },
    tracesSampleRate: 0.05,
    sendDefaultPii: false,
    beforeBreadcrumb: dropSentryBreadcrumb,
    beforeSend: scrubSentryEvent,
    beforeSendTransaction: () => null,
    beforeSendSpan: scrubSentrySpan,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
