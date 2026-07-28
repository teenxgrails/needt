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
      <body className="grid min-h-dvh place-items-center bg-black px-6 text-white">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">Needt hit an unexpected error</h1>
          <p className="mt-3 text-sm text-white/60">
            The error was recorded. Reload the app to continue.
          </p>
          <button
            type="button"
            className="mt-6 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
