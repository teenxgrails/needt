import { formatTaskDescription } from "@/lib/task-description-format";

describe("formatTaskDescription", () => {
  it("wraps a selected range and keeps it selected", () => {
    expect(formatTaskDescription("Plan launch", 5, 11, "bold")).toEqual({
      value: "Plan **launch**",
      selectionStart: 7,
      selectionEnd: 13,
    });
  });

  it("inserts a useful placeholder when there is no selection", () => {
    expect(formatTaskDescription("", 0, 0, "link")).toEqual({
      value: "[link text](https://)",
      selectionStart: 1,
      selectionEnd: 10,
    });
  });

  it("formats every selected line as a checklist", () => {
    expect(
      formatTaskDescription("First\nSecond", 0, 12, "checklist").value
    ).toBe("- [ ] First\n- [ ] Second");
  });
});
