import type { Metadata } from "next";

import { LegalDraft } from "@/components/legal/LegalDraft";

export const metadata: Metadata = {
  title: "Terms draft | Needt",
  description: "Needt terms of service awaiting owner and legal review.",
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <LegalDraft
      title="Terms of Service"
      summary="Needt will publish its Terms of Service here after owner and legal review."
      requirements={[
        "Legal entity name, registered address, and support contact",
        "Service scope, account rules, billing terms, and cancellation process",
        "Applicable law, dispute process, and effective date",
      ]}
    />
  );
}
