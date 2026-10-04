import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/LegalDocument";

import {
  LEGAL_EFFECTIVE_DATE,
  PRIVACY_CONTENT,
  isLegalContentComplete,
} from "@/lib/legal/needt-legal";

export const metadata: Metadata = {
  title: "Privacy Notice | Needt",
  description: "What Needt does with your data, and who else receives it.",
  // A draft must not be indexed; a finished notice should be findable.
  robots: isLegalContentComplete()
    ? { index: true, follow: true }
    : { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      content={PRIVACY_CONTENT}
      effectiveDate={LEGAL_EFFECTIVE_DATE}
    />
  );
}
