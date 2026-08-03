import { summarizeUnscheduledReasons } from "@/lib/scheduling-reasons";

describe("summarizeUnscheduledReasons", () => {
  it("groups exact scheduling reasons for user-facing feedback", () => {
    expect(
      summarizeUnscheduledReasons([
        { taskId: "one", reason: "NO_WORKING_TIME" },
        { taskId: "two", reason: "NO_WORKING_TIME" },
        { taskId: "three", reason: "DEPENDENCY_BLOCKED" },
      ])
    ).toBe(
      "2 tasks: No free time in the Work Schedule. A dependency must be completed first."
    );
  });
});
