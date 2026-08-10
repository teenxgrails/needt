import { SubscriptionPlan, WorkspaceKind } from "@prisma/client";

import { getPlan } from "@/lib/entitlements";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { prisma } from "@/lib/prisma";
import { listUserWorkspaces } from "@/services/workspaces/workspace-service";

jest.mock("@/lib/entitlements", () => ({ getPlan: jest.fn() }));
jest.mock("@/lib/feature-flags", () => ({ isFeatureEnabled: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: { workspaceMember: { findMany: jest.fn() } },
}));

const findMany = prisma.workspaceMember.findMany as jest.Mock;

describe("workspace service security", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isFeatureEnabled).mockResolvedValue(true);
    findMany.mockResolvedValue([]);
  });

  it("hides shared workspace metadata after a plan downgrade", async () => {
    jest.mocked(getPlan).mockResolvedValue(SubscriptionPlan.FREE);

    await listUserWorkspaces("user-1");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-1",
          workspace: { kind: WorkspaceKind.PERSONAL },
        },
      })
    );
  });

  it("lists memberships for paid users when the feature is enabled", async () => {
    jest.mocked(getPlan).mockResolvedValue(SubscriptionPlan.PRO);

    await listUserWorkspaces("user-1");

    expect(findMany.mock.calls[0][0].where).toEqual({ userId: "user-1" });
  });
});
