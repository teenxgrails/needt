import fs from "node:fs";
import path from "node:path";

describe("Space decorative drag contract", () => {
  it("does not expose a reschedule callback or write scheduling fields", () => {
    const spaceSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/tasks/SpaceView.tsx"),
      "utf8"
    );
    const workspaceSource = fs.readFileSync(
      path.join(process.cwd(), "src/app/(app)/tasks/page.tsx"),
      "utf8"
    );

    expect(spaceSource).not.toContain("onRescheduleTask");
    expect(spaceSource).not.toContain("updateTask(");
    expect(workspaceSource).not.toContain("handleSpaceReschedule");
    expect(spaceSource).toContain("Schedule stays");
  });
});
