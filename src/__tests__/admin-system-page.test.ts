import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

import { middleware } from "@/middleware";
import { readFileSync } from "node:fs";
import { join } from "node:path";

jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));

describe("admin system settings page", () => {
  const getTokenMock = getToken as jest.MockedFunction<typeof getToken>;
  const source = readFileSync(
    join(process.cwd(), "src/app/(app)/admin/system/page.tsx"),
    "utf8"
  );

  afterEach(() => {
    getTokenMock.mockReset();
  });

  it("requires an admin session before rendering admin settings", () => {
    expect(source).toContain("const hasAdminAccess = await isAdmin();");
    expect(source).toContain("{hasAdminAccess ? (");
    expect(source).toContain('data-testid="admin-system-form"');
  });

  it("renders access denied instead of the form for a non-admin", () => {
    expect(source).toContain('data-testid="admin-system-access-denied"');
    expect(source).toMatch(
      /\{hasAdminAccess \? \([\s\S]*data-testid="admin-system-form"[\s\S]*\) : \([\s\S]*data-testid="admin-system-access-denied"/
    );
    expect(source).toContain(
      '<AccessDeniedMessage message="You do not have permission to access system settings." />'
    );
  });

  it("lets a signed-in non-admin reach the page access-denied branch", async () => {
    getTokenMock.mockResolvedValue({
      sub: "non-admin-user",
      role: "user",
    });

    const response = await middleware(
      new NextRequest("http://needt.test/admin/system")
    );

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("keeps other admin routes behind the middleware admin boundary", async () => {
    getTokenMock.mockResolvedValue({
      sub: "non-admin-user",
      role: "user",
    });

    const response = await middleware(
      new NextRequest("http://needt.test/admin/operations")
    );

    const location = response.headers.get("location");
    expect(location).not.toBeNull();
    expect(new URL(location!).pathname).toBe("/");
  });
});
