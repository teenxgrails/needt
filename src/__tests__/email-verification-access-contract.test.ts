import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("email-verification access barrier", () => {
  it("checks verification on the server before rendering the app shell", () => {
    const layout = read("src/app/(app)/layout.tsx");
    expect(layout).not.toContain('"use client"');
    expect(layout).toContain("getEmailVerificationStatus");
    expect(layout).toContain("verification?.required && !verification.verified");
  });

  it("does not cover the app when a mocked or missing user has no email", () => {
    const gate = read("src/components/auth/EmailVerificationGate.tsx");
    expect(gate).toContain("status?.email && !status.verified");
  });

  it.each([
    "src/app/api/calendar/caldav/test/route.ts",
    "src/app/api/auth/check-admin/route.ts",
  ])("routes %s through shared authentication", (path) => {
    const route = read(path);
    expect(route).toContain("requireAuth(request)");
  });

  it("gates server admin checks and connector bearer access", () => {
    expect(read("src/lib/auth/is-admin.ts")).toContain(
      "requiresEmailVerificationBeforeAccess"
    );
    expect(read("src/services/connectors/auth.ts")).toContain(
      "getEmailVerificationStatus"
    );
  });

  it("requires an explicit POST so link scanners cannot start a trial", () => {
    const route = read(
      "src/app/api/auth/email-verification/confirm/route.ts"
    );
    expect(route).toContain("export async function POST");
    expect(route).not.toContain("export async function GET");
  });
});
