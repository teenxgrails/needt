import { sanitizeDailyAgendaContent } from "@/lib/daily-agenda-content";

describe("sanitizeDailyAgendaContent", () => {
  it("preserves a canonical task reference and rich-text blocks", () => {
    const result = sanitizeDailyAgendaContent(
      '<h2>Today</h2><div data-type="taskReference" data-task-id="task_123"></div><p>Notes</p>'
    );

    expect(result).toContain("<h2>Today</h2>");
    expect(result).toContain('data-type="taskReference"');
    expect(result).toContain('data-task-id="task_123"');
    expect(result).toContain("<p>Notes</p>");
  });

  it("strips scripts, handlers, and unrelated data attributes", () => {
    const result = sanitizeDailyAgendaContent(
      '<script>alert(1)</script><div data-type="taskReference" data-task-id="task_123" data-secret="no" onclick="alert(2)"></div>'
    );

    expect(result).not.toContain("script");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("data-secret");
    expect(result).toContain('data-task-id="task_123"');
  });
});
