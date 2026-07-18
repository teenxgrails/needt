const findFirst = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    systemSettings: {
      findFirst,
    },
  },
}));

import { getGoogleCredentials, getOutlookCredentials } from "@/lib/auth";

describe("optional calendar credentials", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.DATABASE_URL;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.AZURE_AD_CLIENT_ID;
    delete process.env.AZURE_AD_CLIENT_SECRET;
    delete process.env.AZURE_AD_TENANT_ID;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("uses neutral Google defaults without querying Prisma", async () => {
    await expect(getGoogleCredentials()).resolves.toEqual({
      clientId: "",
      clientSecret: "",
    });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("uses neutral Outlook defaults without querying Prisma", async () => {
    await expect(getOutlookCredentials()).resolves.toEqual({
      clientId: "",
      clientSecret: "",
      tenantId: "common",
    });
    expect(findFirst).not.toHaveBeenCalled();
  });
});
