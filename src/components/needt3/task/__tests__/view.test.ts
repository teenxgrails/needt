import { type TaskData, taskView } from "../view";

const base: TaskData = {
  id: "one",
  title: "Draft the launch brief",
  done: false,
};
const projects = [
  { id: "ops", name: "Operations", color: "var(--hue-orange)", icon: "folder" },
];

describe("v3 task labels", () => {
  it("keeps calendar entries separate from project task metadata", () => {
    expect(
      taskView(
        { ...base, event: true, calendarName: "Work", projectId: "ops" },
        projects
      )
    ).toMatchObject({
      event: true,
      calendarName: "Work",
      projectName: null,
      hue: null,
    });
  });
  it("keeps minute precision and carries the range through midnight", () => {
    const view = taskView({
      ...base,
      scheduledStart: "2026-09-01T23:15",
      estimatedMinutes: 90,
    });
    expect(view.time).toBe("23:15");
    expect(view.range).toBe("23:15–00:45");
    expect(view.dur).toBe("1 h 30");
    expect(view.durLong).toBe("1 h 30 min");
  });

  it("never assigns an unrelated project to an unassigned task", () => {
    expect(
      taskView({ ...base, projectId: null, project: "ops" }, projects)
        .projectName
    ).toBeNull();
    expect(taskView({ ...base, project: "unknown" }, projects).hue).toBeNull();
    expect(taskView({ ...base, projectId: "ops" }, projects).projectName).toBe(
      "Operations"
    );
  });

  it("distinguishes missing capability and counts open and done parts", () => {
    expect(taskView({ ...base, parts: null }).parts).toBeNull();
    expect(taskView({ ...base, parts: [] }).parts).toBeNull();
    expect(
      taskView({
        ...base,
        parts: [
          { title: "First", done: true },
          { title: "Second", done: false },
        ],
      }).parts
    ).toEqual({ done: 1, total: 2 });
  });

  it("uses the adapter due day and keeps the authored overdue flag", () => {
    const view = taskView({
      ...base,
      dueDate: "2026-08-31",
      due: "wrong",
      overdue: true,
    });
    expect(view.due).toBe("31 Aug");
    expect(view.lateTitle).toBe("Overdue — was due 31 Aug");
    expect(view.overdue).toBe(true);
  });

  it("preserves money, first step and source without manufacturing absent fields", () => {
    const source = {
      kind: "mail" as const,
      id: "message",
      quote: "Please review",
    };
    const view = taskView({
      ...base,
      value: 240,
      entry: "Open the notes",
      source,
    });
    expect(view).toMatchObject({ value: 240, entry: "Open the notes", source });
    expect(taskView(base)).toMatchObject({
      time: null,
      minutes: null,
      len: 30,
      source: null,
    });
  });
});
