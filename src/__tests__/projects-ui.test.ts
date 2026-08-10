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
  const archiveDialog = readFileSync(
    join(process.cwd(), "src/components/projects/ArchiveProjectDialog.tsx"),
    "utf8"
  );
  const archivedDialog = readFileSync(
    join(process.cwd(), "src/components/projects/ArchivedProjectsDialog.tsx"),
    "utf8"
  );
  const dependencies = readFileSync(
    join(process.cwd(), "src/components/tasks/TaskDependenciesSection.tsx"),
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

  it("removes manual progress after every project view lands", () => {
    expect(modal).not.toContain('htmlFor="progress"');
    expect(modal).not.toContain("setProgress");
  });

  it("archives projects without destructive copy and provides restore", () => {
    expect(modal).toContain("Archive Project");
    expect(modal).toContain("Restore Project");
    expect(modal).not.toContain("Delete Project");
    expect(archiveDialog).toContain("tasks, stages, and history stay intact");
    expect(archivedDialog).toContain("unarchiveProject");
    expect(workspace).toContain("ArchivedProjectsDialog");
  });

  it("offers dependency choices only inside the current project", () => {
    expect(dependencies).toContain("task.projectId === projectId");
    expect(dependencies).toContain(
      "Add this task to a project before creating dependencies."
    );
  });
});
