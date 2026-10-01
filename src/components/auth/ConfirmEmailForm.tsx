"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ConfirmEmailForm({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/email-verification/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      const result = (await response.json()) as { status?: string };
      if (!response.ok || result.status !== "verified") {
        setError(
          result.status === "expired"
            ? "This confirmation link has expired. Request a new one in Needt."
            : "This confirmation link is invalid or has already been used."
        );
        return;
      }
      window.location.assign("/settings?emailVerification=verified");
    } catch {
      setError("Email confirmation is temporarily unavailable. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Confirm your email</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--text-secondary)]">
            Confirm {email} to start 14 days of Pro.
          </p>
          {error && (
            <p className="mt-3 text-sm text-[var(--color-danger)]" role="alert">
              {error}
            </p>
          )}
          <Button
            className="mt-5 w-full"
            disabled={submitting || !email || !token}
            onClick={() => void confirm()}
          >
            {submitting ? "Confirming…" : "Confirm email"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
