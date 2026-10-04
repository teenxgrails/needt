import { createElement } from "react";

import { renderToStaticMarkup } from "react-dom/server";

import { LegalDocument } from "@/components/legal/LegalDocument";

import {
  PRIVACY_CONTENT,
  TERMS_CONTENT,
  pendingIdentityKeys,
} from "@/lib/legal/needt-legal";

function render(content: typeof PRIVACY_CONTENT) {
  return renderToStaticMarkup(
    createElement(LegalDocument, { content, effectiveDate: "1 January 2026" })
  );
}

describe("LegalDocument", () => {
  it("renders every heading and the identity block", () => {
    const markup = render(PRIVACY_CONTENT);
    for (const section of PRIVACY_CONTENT.sections) {
      expect(markup).toContain(section.heading);
    }
    expect(markup).toContain("Who you are dealing with");
    expect(markup).toContain("Registered address");
  });

  it("renders a table's rows, not only its headings", () => {
    const markup = render(PRIVACY_CONTENT);
    expect(markup).toContain("Hetzner Online GmbH (Finland)");
    expect(markup).toContain("Helsinki");
  });

  it("says it is a draft while a fact is missing, and names what is missing", () => {
    const markup = render(TERMS_CONTENT);
    if (pendingIdentityKeys().length > 0) {
      expect(markup).toContain("This page is not published yet");
      expect(markup).toContain("Draft — not yet in force");
      expect(markup).toContain("To be completed before publication");
      expect(markup).not.toContain("In force since");
    } else {
      expect(markup).toContain("In force since 1 January 2026");
      expect(markup).not.toContain("This page is not published yet");
    }
  });
});
