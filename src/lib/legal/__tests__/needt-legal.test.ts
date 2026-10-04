import {
  LEGAL_IDENTITY,
  PRIVACY_CONTENT,
  TERMS_CONTENT,
  isLegalContentComplete,
  isPending,
  pendingIdentityKeys,
} from "@/lib/legal/needt-legal";

describe("legal content", () => {
  it("reports every owner-supplied fact that is still missing", () => {
    const pending = pendingIdentityKeys();
    const stillPending = (
      Object.keys(LEGAL_IDENTITY) as Array<keyof typeof LEGAL_IDENTITY>
    ).filter((key) => isPending(LEGAL_IDENTITY[key]));
    expect(pending).toEqual(stillPending);
    expect(isLegalContentComplete()).toBe(stillPending.length === 0);
  });

  it("never claims to be in force while a fact is missing", () => {
    // The pages read this to decide whether search engines may index them, so
    // the two must not drift apart.
    if (pendingIdentityKeys().length > 0) {
      expect(isLegalContentComplete()).toBe(false);
    }
  });

  it("names the places data is actually sent", () => {
    const recipients = PRIVACY_CONTENT.sections.find(
      (section) => section.heading === "Who receives it"
    )?.table?.rows;
    expect(recipients).toBeDefined();
    const named = (recipients ?? []).map(([service]) => service).join(" ");
    // Each of these corresponds to an outbound integration in this repository.
    for (const service of [
      "Hetzner",
      "Resend",
      "Sentry",
      "Creem",
      "Google",
      "Microsoft",
      "CalDAV",
      "Composio",
      "OpenRouter",
    ]) {
      expect(named).toContain(service);
    }
    // Storage is Postgres on our own host; naming a provider we do not use
    // would be a false statement in a published notice.
    expect(named).not.toMatch(/Cloudflare|\bR2\b|\bS3\b/);
  });

  it("gives both documents substance, not headings alone", () => {
    for (const document of [PRIVACY_CONTENT, TERMS_CONTENT]) {
      expect(document.intro.length).toBeGreaterThan(0);
      expect(document.sections.length).toBeGreaterThan(8);
      for (const section of document.sections) {
        const hasBody =
          (section.paragraphs?.length ?? 0) > 0 ||
          (section.list?.length ?? 0) > 0 ||
          (section.table?.rows.length ?? 0) > 0;
        expect(hasBody).toBe(true);
      }
    }
  });
});
