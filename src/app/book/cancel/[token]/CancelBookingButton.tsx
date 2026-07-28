"use client";

import { useState } from "react";

import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CancelBookingButton({ token }: { token: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  async function cancel() {
    setStatus("loading");
    const response = await fetch(
      `/api/public/booking/cancel/${encodeURIComponent(token)}`,
      { method: "POST" }
    );
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Could not cancel this booking");
      setStatus("error");
      return;
    }
    setStatus("done");
  }

  if (status === "done") {
    return (
      <p className="flex items-center justify-center gap-2 text-sm">
        <Check className="h-4 w-4" /> Booking canceled.
      </p>
    );
  }
  return (
    <div>
      <Button
        className="h-11 w-full"
        variant="destructive"
        disabled={status === "loading"}
        onClick={() => void cancel()}
      >
        {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
        Cancel booking
      </Button>
      {status === "error" && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
