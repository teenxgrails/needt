import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/LegalDocument";

import {
  LEGAL_EFFECTIVE_DATE,
  TERMS_CONTENT,
  isLegalContentComplete,
} from "@/lib/legal/needt-legal";

export const metadata: Metadata = {
  title: "Terms of Service | Needt",
  description: "The agreement between you and Needt.",
  robots: isLegalContentComplete()
    ? { index: true, follow: true }
    : { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <LegalDocument
      content={TERMS_CONTENT}
      effectiveDate={LEGAL_EFFECTIVE_DATE}
    />
  );
}
