"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

import { logger } from "@/lib/logger";

interface FeatureErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  feature: string;
}

export function FeatureErrorFallback({
  error,
  reset,
  feature,
}: FeatureErrorFallbackProps) {
  useEffect(() => {
    void logger.error(
      `${feature} route failed to render`,
      { error: error.message, digest: error.digest ?? null },
      `${feature}ErrorBoundary`
    );
  }, [error, feature]);

  return (
    <section className="grid min-h-[320px] place-items-center bg-[var(--surface-canvas)] p-6 text-center">
      <div>
        <h1 className="text-base font-semibold text-[var(--text-primary)]">
          {feature} could not load
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          The rest of Needt is still available. Try this section again.
        </p>
        <Button
          className="mt-4"
          type="button"
          variant="outline"
          onClick={reset}
        >
          Try again
        </Button>
      </div>
    </section>
  );
}
