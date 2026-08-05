import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("projects workspace UI contract", () => {
  const workspace = readFileSync(
    join(process.cwd(), "src/components/projects/ProjectWorkspace.tsx"),
    "utf8"
  );
  const list = readFileSync(
    join(process.cwd(), "src/components/projects/ProjectListView.tsx"),
    "utf8"
  );
  const kanban = readFileSync(
    join(process.cwd(), "src/components/projects/ProjectKanbanView.tsx"),
    "utf8"
  );
  const gantt = readFileSync(
    join(process.cwd(), "src/components/projects/ProjectGanttView.tsx"),
    "utf8"
  );
  const templates = readFileSync(
    join(process.cwd(), "src/components/projects/ProjectTemplatesDialog.tsx"),
    "utf8"
  );
  const modal = readFileSync(
    join(process.cwd(), "src/components/projects/ProjectModal.tsx"),
    "utf8"
  );

  it("uses the shared picker and accessible project view tabs", () => {
    expect(workspace).toContain("<NeedtPicker");
    expect(workspace).toContain('ariaLabel="Choose project"');
    expect(workspace).toMatch(/<TabsTrigger\s+value="list"/);
    expect(workspace).toMatch(/<TabsTrigger\s+value="kanban"/);
    expect(workspace).toMatch(/<TabsTrigger\s+value="gantt"/);
    expect(workspace).not.toContain("<select");
  });

  it("renders stage-oriented list and kanban surfaces", () => {
    expect(list).toContain("project-stage-${group.id}");
    expect(list).toContain("ProjectListView");
    expect(kanban).toContain("useDroppable");
    expect(kanban).toContain("UNASSIGNED_STAGE_ID");
    expect(gantt).toContain("buildProjectGanttRange");
    expect(gantt).toContain("Project timeline");
    expect(templates).toContain("placeholder role per task");
    expect(templates).toContain("ProjectTemplateKind.WORKFLOW");
    expect(templates).toContain("calendarDayDifference");
  });

  it("keeps manual progress available until every project view lands", () => {
    expect(modal).toContain('htmlFor="progress"');
    expect(modal).toContain("setProgress");
  });
});
