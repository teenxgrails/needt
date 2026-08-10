import type { Metadata } from "next";

import { FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Page not found | Needt",
  description: "This public Page link is invalid or no longer exists.",
  robots: { index: false, follow: false },
};

export default function PublishedPageNotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--surface-canvas)] px-6 text-[var(--text-primary)]">
      <div className="max-w-md text-center">
        <FileText className="mx-auto mb-4 h-9 w-9 text-[var(--text-muted)]" />
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          This public link is invalid or no longer exists.
        </p>
      </div>
    </main>
  );
}
