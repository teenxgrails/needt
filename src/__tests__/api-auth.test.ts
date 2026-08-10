import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

import { requireAdmin, requireAuth } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

jest.mock("next-auth/jwt", () => ({ getToken: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: jest.fn() } },
}));

const userModel = prisma.user as unknown as { findUnique: jest.Mock };

function request(path = "/api/private") {
  return new NextRequest(`http://localhost${path}`);
}

describe("shared API authentication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getToken).mockResolvedValue({ sub: "user-1" });
    userModel.findUnique.mockResolvedValue({ isActive: true, role: "user" });
  });

  it("rejects a token whose user no longer exists", async () => {
    userModel.findUnique.mockResolvedValue(null);

    const response = await requireAuth(request());

    expect(response?.status).toBe(401);
  });

  it("rejects a disabled user", async () => {
    userModel.findUnique.mockResolvedValue({ isActive: false, role: "admin" });

    const response = await requireAuth(request());

    expect(response?.status).toBe(401);
  });

  it("uses the current database role instead of a stale admin claim", async () => {
    jest.mocked(getToken).mockResolvedValue({
      sub: "user-1",
      role: "admin",
    });
    userModel.findUnique.mockResolvedValue({ isActive: true, role: "user" });

    const response = await requireAdmin(request("/api/admin"));

    expect(response?.status).toBe(403);
  });

  it("allows an active database admin", async () => {
    jest.mocked(getToken).mockResolvedValue({ sub: "admin-1", role: "user" });
    userModel.findUnique.mockResolvedValue({ isActive: true, role: "admin" });

    await expect(requireAdmin(request("/api/admin"))).resolves.toBeNull();
  });
});
