import { SavedViewVisibility, WorkspaceRole } from "@prisma/client";

import { canManageWorkspaceView, savedViewInputSchema } from "@/lib/saved-views";

describe("Saved View contract", () => {
  it("accepts only versioned allow-listed queries", () => {
    expect(
      savedViewInputSchema.parse({
        name: "My priorities",
        visibility: SavedViewVisibility.PERSONAL,
        resource: "TASKS",
        type: "list",
        filters: [{ field: "priority", operator: "in", value: ["high"] }],
      }).queryVersion
    ).toBe(1);
    expect(() =>
      savedViewInputSchema.parse({
        name: "Unsafe",
        visibility: SavedViewVisibility.PERSONAL,
        resource: "TASKS",
        type: "list",
        filters: [{ field: "workspaceId", operator: "eq", value: "other" }],
      })
    ).toThrow();
  });

  it("requires an editor to manage workspace views", () => {
    expect(canManageWorkspaceView(WorkspaceRole.VIEWER)).toBe(false);
    expect(canManageWorkspaceView(WorkspaceRole.EDITOR)).toBe(true);
    expect(canManageWorkspaceView(WorkspaceRole.OWNER)).toBe(true);
  });
});
