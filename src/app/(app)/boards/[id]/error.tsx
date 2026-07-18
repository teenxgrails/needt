"use client";

import { FeatureErrorFallback } from "@/components/errors/FeatureErrorFallback";

export default function BoardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <FeatureErrorFallback feature="Boards" error={error} reset={reset} />;
}
