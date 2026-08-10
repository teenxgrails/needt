import type { Metadata } from "next";

import { LegalDraft } from "@/components/legal/LegalDraft";

export const metadata: Metadata = {
  title: "Privacy draft | Needt",
  description: "Needt privacy notice awaiting owner and legal review.",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <LegalDraft
      title="Privacy Notice"
      summary="Needt will publish its privacy notice here after owner and legal review."
      requirements={[
        "Data controller contact and privacy contact method",
        "Collected data, purposes, legal bases, retention, and service providers",
        "International transfers, user rights, complaint process, and effective date",
      ]}
    />
  );
}
