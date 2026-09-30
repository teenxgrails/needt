import { type ReactNode, createElement as mockCreateElement } from "react";

import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

import AdminSystemPage from "@/app/(app)/admin/system/page";
import { middleware } from "@/middleware";
import { renderToStaticMarkup } from "react-dom/server";

import { getAuthOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/prisma";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) =>
    mockCreateElement("a", { href }, children),
}));

jest.mock("@/components/settings/SystemSettings", () => ({
  SystemSettings: () =>
    mockCreateElement(
      "section",
      { "data-testid": "system-settings-sentinel" },
      "Google Client Secret"
    ),
}));

jest.mock("@/components/settings/UserManagement", () => ({
  UserManagement: () => null,
}));

jest.mock("@/components/settings/LogViewer", () => ({
  LogViewer: () => null,
}));

jest.mock("@/lib/auth/auth-options", () => ({
  getAuthOptions: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe("admin system settings page", () => {
  const getServerSessionMock = getServerSession as jest.MockedFunction<
    typeof getServerSession
  >;
  const getAuthOptionsMock = getAuthOptions as jest.MockedFunction<
    typeof getAuthOptions
  >;
  const getTokenMock = getToken as jest.MockedFunction<typeof getToken>;
  const findUserMock = prisma.user.findUnique as jest.Mock;

  beforeEach(() => {
    getAuthOptionsMock.mockResolvedValue({} as never);
    getTokenMock.mockReset();
    getServerSessionMock.mockReset();
    findUserMock.mockReset();
  });

  async function renderPage() {
    return renderToStaticMarkup(await AdminSystemPage());
  }

  it("renders the system credential form for an active admin", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { email: "admin@needt.test", role: "admin" },
    } as never);
    findUserMock.mockResolvedValue({ isActive: true, role: "admin" });

    const markup = await renderPage();

    expect(markup).toContain('data-testid="admin-system-form"');
    expect(markup).toContain('data-testid="system-settings-sentinel"');
    expect(markup).not.toContain("admin-system-access-denied");
  });

  it("renders access denied instead of the form for a non-admin", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { email: "member@needt.test", role: "user" },
    } as never);
    findUserMock.mockResolvedValue({ isActive: true, role: "user" });

    const markup = await renderPage();

    expect(markup).toContain('data-testid="admin-system-access-denied"');
    expect(markup).toContain(
      "You do not have permission to access system settings."
    );
    expect(markup).not.toContain('data-testid="admin-system-form"');
    expect(markup).not.toContain('data-testid="system-settings-sentinel"');
  });

  it("denies an inactive admin even when the session still says admin", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { email: "former-admin@needt.test", role: "admin" },
    } as never);
    findUserMock.mockResolvedValue({ isActive: false, role: "admin" });

    const markup = await renderPage();

    expect(markup).toContain('data-testid="admin-system-access-denied"');
    expect(markup).not.toContain('data-testid="admin-system-form"');
    expect(markup).not.toContain('data-testid="system-settings-sentinel"');
  });

  it("redirects a signed-in non-admin away from /admin/system in middleware", async () => {
    getTokenMock.mockResolvedValue({
      sub: "non-admin-user",
      role: "user",
    });

    const response = await middleware(
      new NextRequest("http://needt.test/admin/system")
    );

    const location = response.headers.get("location");
    expect(location).not.toBeNull();
    expect(new URL(location!).pathname).toBe("/");
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
