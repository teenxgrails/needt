import { meetingActionsSchema } from "@/services/pages/meeting-note-proposals";

describe("meeting-note proposal actions", () => {
  it("keeps task and schedule mutations in a strict versioned action set", () => {
    expect(
      meetingActionsSchema.parse([
        { type: "CREATE_TASK", title: "Send recap", schedule: true },
        { type: "RESCHEDULE_WORKSPACE" },
      ])
    ).toHaveLength(2);
    expect(() =>
      meetingActionsSchema.parse([{ type: "DELETE_TASK", taskId: "task-1" }])
    ).toThrow();
  });
});
