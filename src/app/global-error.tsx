"use client";

import { useEffect } from "react";

import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="grid min-h-dvh place-items-center bg-[var(--surface-canvas,#0e0e10)] px-6 text-[var(--text-primary,#ececee)]">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">
            Needt hit an unexpected error
          </h1>
          <p className="mt-3 text-sm text-[var(--text-secondary,#9aa0a6)]">
            The error was recorded. Reload the app to continue.
          </p>
          <button
            type="button"
            className="mt-6 rounded-[var(--control-radius,6px)] bg-[var(--text-primary,#ececee)] px-4 py-2 text-sm font-medium text-[var(--text-inverse,#0e0e10)]"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
