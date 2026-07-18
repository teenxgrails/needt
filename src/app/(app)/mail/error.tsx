"use client";

import { FeatureErrorFallback } from "@/components/errors/FeatureErrorFallback";

export default function MailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <FeatureErrorFallback feature="Mail" error={error} reset={reset} />;
}
