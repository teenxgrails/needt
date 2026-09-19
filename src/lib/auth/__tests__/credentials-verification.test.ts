import { compare } from "bcryptjs";

import { authenticateUser } from "@/lib/auth/credentials-provider";
import { prisma } from "@/lib/prisma";

jest.mock("bcryptjs", () => ({ compare: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    systemSettings: { findFirst: jest.fn() },
  },
}));

const unverifiedUser = {
  id: "user-1",
  email: "person@example.com",
  emailVerified: null,
  isActive: true,
  role: "user",
  accounts: [
    {
      provider: "credentials",
      id_token: "password-hash",
    },
  ],
};

describe("credentials verification feature flag", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(prisma.user.findUnique).mockResolvedValue(unverifiedUser as never);
    jest.mocked(compare).mockResolvedValue(true as never);
  });

  it("allows immediate Free access while the flag is off", async () => {
    jest.mocked(prisma.systemSettings.findFirst).mockResolvedValue({
      requireEmailVerificationBeforeAccess: false,
    } as never);
    await expect(
      authenticateUser(" Person@Example.com ", "password")
    ).resolves.toMatchObject({ id: "user-1" });
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "person@example.com" } })
    );
  });

  it("blocks product sign-in while the flag is on", async () => {
    jest.mocked(prisma.systemSettings.findFirst).mockResolvedValue({
      requireEmailVerificationBeforeAccess: true,
    } as never);
    await expect(
      authenticateUser("person@example.com", "password")
    ).resolves.toBeNull();
  });
});
