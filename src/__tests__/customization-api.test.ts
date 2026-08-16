import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { PATCH } from "@/app/api/customization/route";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/auth/api-auth", () => ({
  authenticateRequest: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    userCustomization: { upsert: jest.fn() },
  },
}));

const customizations = prisma.userCustomization as unknown as {
  upsert: jest.Mock;
};

describe("customization API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authenticateRequest).mockResolvedValue({ userId: "user-1" });
    customizations.upsert.mockResolvedValue({ userId: "user-1" });
  });

  it("accepts the nullable design token value returned by the settings API", async () => {
    const response = await PATCH(
      new NextRequest("http://localhost/api/customization", {
        method: "PATCH",
        body: JSON.stringify({
          accentColor: "#6366F1",
          designTokens: null,
        }),
      })
    );
    if (!response) throw new Error("Expected a response");

    expect(response.status).toBe(200);
    expect(customizations.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ designTokens: Prisma.DbNull }),
      })
    );
  });
});
