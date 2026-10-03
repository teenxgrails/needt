/* THE PARSER'S OWN TESTS.
 *
 * The composer is judged by eye; the parser cannot be. It decides what a typed
 * sentence becomes, and the only way to know it is right is to state every
 * sentence and its verdict here.
 *
 * The reference date is the fixture's own: Tuesday, 1 September 2026. Every
 * expectation below is relative to it, which is exactly why `coParse` takes
 * `now` as an argument instead of reading the clock.
 */
import { newDateFromYMD, startOfDay } from "@/lib/date-utils";
import { projects } from "@/lib/needt/fixture";

import { coDraft, coParse } from "../co-parse";

/** Tuesday, 1 September 2026 — the day the fixture calls today. */
const NOW = newDateFromYMD(2026, 8, 1);

function day(year: number, month: number, date: number): number {
  return startOfDay(newDateFromYMD(year, month, date)).getTime();
}

describe("coParse — the day", () => {
  it("reads a date with no year, and picks the nearest one", () => {
    const near = coParse("Ship the audit 4 Sep", NOW);
    expect(near.found.date?.on.getTime()).toBe(day(2026, 8, 4));
    expect(near.found.date?.label).toBe("4 Sep");

    /* Eight months back in this year is last year's date: the no-year rule the
       whole product shares, so "31 Dec" reads correctly on 1 January. */
    const far = coParse("Ship the audit 20 Jan", NOW);
    expect(far.found.date?.on.getTime()).toBe(day(2027, 0, 20));

    /* Either order of day and month, one verdict. */
    expect(coParse("Ship it Sep 4", NOW).found.date?.on.getTime()).toBe(
      day(2026, 8, 4)
    );
  });

  it("reads the relative days against the reference date", () => {
    expect(coParse("Call Anna today", NOW).found.date?.on.getTime()).toBe(
      day(2026, 8, 1)
    );
    expect(coParse("Call Anna tomorrow", NOW).found.date?.on.getTime()).toBe(
      day(2026, 8, 2)
    );
    expect(coParse("Call Anna in 3 days", NOW).found.date?.on.getTime()).toBe(
      day(2026, 8, 4)
    );
    /* Tuesday to the coming Friday. */
    expect(coParse("Call Anna friday", NOW).found.date?.on.getTime()).toBe(
      day(2026, 8, 4)
    );
    /* The coming Saturday, and the Monday after this week. */
    expect(
      coParse("Call Anna this weekend", NOW).found.date?.on.getTime()
    ).toBe(day(2026, 8, 5));
    expect(coParse("Call Anna next week", NOW).found.date?.on.getTime()).toBe(
      day(2026, 8, 7)
    );
  });

  it("does not find a day inside a word that merely starts like one", () => {
    /* "money" opens with "mon". A label is not Monday. */
    const parsed = coParse("Chase the money", NOW);
    expect(parsed.found.date).toBeNull();
    expect(parsed.found.labels.map((each) => each.name)).toEqual(["money"]);
  });
});

describe("coParse — the clock", () => {
  it("reads a time with no date, and assumes nothing", () => {
    const parsed = coParse("Call Anna at 3pm", NOW);
    expect(parsed.found.time?.minutes).toBe(15 * 60);
    expect(parsed.found.time?.label).toBe("3pm");
    /* The line said no day. The parser reports that honestly; supplying one is
       the composer's job, and it draws that chip grey. */
    expect(parsed.found.date).toBeNull();

    const draft = coDraft(parsed, NOW);
    expect(draft.time).toBe("15:00");
    expect(draft.assumedDate).toBe(true);
    expect(draft.due).toBe("1 Sep");
  });

  it("reads the three clock forms", () => {
    expect(coParse("Standup 9:30", NOW).found.time?.minutes).toBe(9 * 60 + 30);
    expect(coParse("Lunch noon", NOW).found.time?.minutes).toBe(12 * 60);
    expect(coParse("Land midnight", NOW).found.time?.minutes).toBe(0);
    expect(coParse("Call 12am", NOW).found.time?.minutes).toBe(0);
    expect(coParse("Call 12pm", NOW).found.time?.minutes).toBe(12 * 60);
  });
});

describe("coParse — the duration", () => {
  it("reads minutes and hours, and answers in minutes either way", () => {
    const minutes = coParse("Review the deck for 45 min", NOW);
    expect(minutes.found.duration?.minutes).toBe(45);
    expect(minutes.found.duration?.label).toBe("45 min");

    const hours = coParse("Review the deck for 2 hours", NOW);
    expect(hours.found.duration?.minutes).toBe(120);
    expect(hours.found.duration?.label).toBe("2 h");

    expect(coParse("Review for 90m", NOW).found.duration?.minutes).toBe(90);
    expect(coParse("Review for 1h", NOW).found.duration?.minutes).toBe(60);
    expect(coDraft(coParse("Review for 1h", NOW), NOW).est).toBe(60);
  });
});

describe("coParse — the project", () => {
  it("reads a project by name", () => {
    const parsed = coParse("Fix the pipeline Operations", NOW);
    expect(parsed.found.project?.project.id).toBe("ops");
    expect(parsed.found.project?.label).toBe("Operations");
    /* The hue comes from the project, which is the whole colour policy. */
    expect(parsed.found.project?.project.hue).toBe(
      projects.find((each) => each.id === "ops")?.hue
    );
  });

  it("reads a project by the fixture's own aliases", () => {
    expect(coParse("Verbs drill de", NOW).found.project?.project.id).toBe(
      "german"
    );
    expect(coParse("Book the dentist personal", NOW).found.project?.project.id).toBe(
      "life"
    );
  });

  it("claims a two-word project whole, and takes only one project", () => {
    const parsed = coParse("Tidy the tokens Design system Operations", NOW);
    expect(parsed.found.project?.project.id).toBe("ds");
    expect(parsed.found.project?.text).toBe("Design system");
    expect(parsed.marks.filter((mark) => mark.kind === "project")).toHaveLength(
      1
    );
  });

  it("is case-insensitive but answers with the project's own name", () => {
    expect(coParse("ship it resale", NOW).found.project?.label).toBe("Resale");
  });
});

describe("coParse — priority and labels", () => {
  it("reads a priority marker", () => {
    expect(coParse("Send the invoice urgent", NOW).found.priority?.level).toBe(
      "urgent"
    );
    expect(coParse("Send the invoice asap", NOW).found.priority?.level).toBe(
      "urgent"
    );
    expect(
      coParse("Send the invoice sometime", NOW).found.priority?.level
    ).toBe("whenever");
    expect(coParse("Send the invoice urgent", NOW).found.priority?.label).toBe(
      "Urgent"
    );
  });

  it("reads several labels in one line", () => {
    const parsed = coParse("Post the parcel errand money admin", NOW);
    expect(parsed.found.labels.map((each) => each.name)).toEqual([
      "errand",
      "money",
      "admin",
    ]);
    expect(coDraft(parsed, NOW).labels).toEqual(["errand", "money", "admin"]);
  });

  it("claims a two-word label whole", () => {
    const parsed = coParse("Rewrite the brief deep work", NOW);
    expect(parsed.found.labels.map((each) => each.name)).toEqual(["deep work"]);
  });
});

describe("coParse — where two facets collide", () => {
  it("takes a deadline before a date can take the same day", () => {
    const parsed = coParse("File the return by friday", NOW);
    expect(parsed.found.deadline?.on.getTime()).toBe(day(2026, 8, 4));
    expect(parsed.found.deadline?.label).toBe("by friday");
    expect(parsed.found.date).toBeNull();
  });

  it("takes a cadence before a date can take its weekday", () => {
    const parsed = coParse("German every friday", NOW);
    expect(parsed.found.repeat?.cadence).toBe("weekday");
    expect(parsed.found.repeat?.weekday).toBe(5);
    expect(parsed.found.date).toBeNull();
    /* A recurring thing is a habit whatever else the line says. */
    expect(parsed.kind).toBe("habit");
  });

  it("keeps a deadline and a separate day apart", () => {
    const parsed = coParse("Draft the memo tomorrow by friday", NOW);
    expect(parsed.found.date?.on.getTime()).toBe(day(2026, 8, 2));
    expect(parsed.found.deadline?.on.getTime()).toBe(day(2026, 8, 4));
  });

  it("does not let a duration and a time eat each other", () => {
    const parsed = coParse("Studio at 3pm for 2 hours", NOW);
    expect(parsed.found.time?.minutes).toBe(15 * 60);
    expect(parsed.found.duration?.minutes).toBe(120);
  });

  it("claims every run once, and never twice", () => {
    const parsed = coParse(
      "Call Anna tomorrow at 3pm for 30 min Operations urgent errand",
      NOW
    );
    const kinds = parsed.marks.map((mark) => mark.kind);
    expect(kinds).toEqual([
      "date",
      "time",
      "duration",
      "project",
      "priority",
      "label",
    ]);
    /* The marks are in the order they appear, and no two of them overlap. */
    for (let i = 1; i < parsed.marks.length; i++) {
      expect(parsed.marks[i].from).toBeGreaterThanOrEqual(
        parsed.marks[i - 1].to
      );
    }
  });

  it("reads the same run of words as exactly one facet", () => {
    /* "Life" is a project. It must not also be claimed as anything else, and
       the run it claims is the run the underline will mark. */
    const parsed = coParse("Sort the paperwork Life admin", NOW);
    const project = parsed.marks.find((mark) => mark.kind === "project");
    expect(parsed.text.slice(project?.from, project?.to)).toBe("Life");
    expect(parsed.found.labels.map((each) => each.name)).toEqual(["admin"]);
  });
});

describe("coParse — the verdict", () => {
  it("infers the four kinds", () => {
    expect(coParse("Call Anna", NOW).kind).toBe("task");
    expect(coParse("Call Anna tomorrow 3pm", NOW).kind).toBe("event");
    expect(coParse("Lunch with Anna", NOW).kind).toBe("event");
    expect(coParse("Notes on the factory", NOW).kind).toBe("doc");
    expect(coParse("German every day", NOW).kind).toBe("habit");
  });
});

describe("coParse — parts", () => {
  it("takes everything after a slash as parts, one level only", () => {
    const parsed = coParse("Pack the order / print label / tape it", NOW);
    expect(parsed.title).toBe("Pack the order");
    expect(parsed.parts).toEqual(["print label", "tape it"]);
    expect(coDraft(parsed, NOW).parts).toEqual([
      { title: "print label", done: false },
      { title: "tape it", done: false },
    ]);
  });

  it("does not parse the parts as facets of the task", () => {
    const parsed = coParse("Pack the order / post it tomorrow", NOW);
    expect(parsed.found.date).toBeNull();
  });
});

describe("coDraft", () => {
  it("hands back the shapes the data contract already uses", () => {
    const parsed = coParse(
      "Call Anna tomorrow at 3pm for 30 min Operations urgent errand",
      NOW
    );
    const draft = coDraft(parsed, NOW, {
      note: "  ask about the invoice  ",
      files: ["Q3-roadmap.pdf"],
    });

    expect(draft).toMatchObject({
      kind: "event",
      title: "Call Anna tomorrow at 3pm for 30 min Operations urgent errand",
      project: "Operations",
      due: "2 Sep",
      assumedDate: false,
      time: "15:00",
      est: 30,
      priority: "urgent",
      labels: ["errand"],
      note: "ask about the invoice",
      files: ["Q3-roadmap.pdf"],
    });
  });

  it("assumes today when the line named no day, and says that it assumed", () => {
    const draft = coDraft(coParse("Call Anna", NOW), NOW);
    expect(draft.assumedDate).toBe(true);
    expect(draft.on?.getTime()).toBe(day(2026, 8, 1));
  });

  it("assumes no day at all for a habit — a cadence is not a date", () => {
    const draft = coDraft(coParse("German every day", NOW), NOW);
    expect(draft.assumedDate).toBe(false);
    expect(draft.on).toBeNull();
    expect(draft.repeat).toBe("day");
  });

  it("keeps an empty note out of the draft", () => {
    expect(coDraft(coParse("Call Anna", NOW), NOW, { note: "   " }).note).toBe(
      null
    );
  });
});
