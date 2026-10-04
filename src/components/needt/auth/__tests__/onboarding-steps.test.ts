import {
  ONBOARDING_STEPS,
  canAdvanceOnboardingStep,
  defaultOnboardingAnswers,
  initialOnboardingState,
  onboardingCapturedCount,
  onboardingReducer,
} from "../onboarding-steps";

describe("ONBOARDING_STEPS order", () => {
  it("is You, Your hours, How you work, Calendars, First tasks — in that order", () => {
    expect(ONBOARDING_STEPS.map((step) => step.id)).toEqual([
      "you",
      "hours",
      "view",
      "calendars",
      "first",
    ]);
    expect(ONBOARDING_STEPS.map((step) => step.title)).toEqual([
      "You",
      "Your hours",
      "How you work",
      "Calendars",
      "First tasks",
    ]);
  });
});

describe("canAdvanceOnboardingStep", () => {
  const base = defaultOnboardingAnswers();

  it("blocks 'you' until a name is entered", () => {
    expect(canAdvanceOnboardingStep("you", base)).toBe(false);
    expect(canAdvanceOnboardingStep("you", { ...base, name: "   " })).toBe(
      false
    );
    expect(canAdvanceOnboardingStep("you", { ...base, name: "Maksym" })).toBe(
      true
    );
  });

  it("blocks 'hours' unless the day starts before it ends", () => {
    expect(
      canAdvanceOnboardingStep("hours", {
        ...base,
        hoursStart: "09:00",
        hoursEnd: "18:00",
      })
    ).toBe(true);
    expect(
      canAdvanceOnboardingStep("hours", {
        ...base,
        hoursStart: "18:00",
        hoursEnd: "09:00",
      })
    ).toBe(false);
    expect(
      canAdvanceOnboardingStep("hours", {
        ...base,
        hoursStart: "09:00",
        hoursEnd: "09:00",
      })
    ).toBe(false);
  });

  it("never blocks 'view' — a default view is always selected", () => {
    expect(canAdvanceOnboardingStep("view", base)).toBe(true);
  });

  it("never blocks 'calendars' or 'first' — Skip exists because these are optional", () => {
    expect(canAdvanceOnboardingStep("calendars", base)).toBe(true);
    expect(canAdvanceOnboardingStep("first", base)).toBe(true);
  });
});

describe("onboardingReducer", () => {
  it("advance() is a no-op while the current step's requirement is unmet", () => {
    const state = initialOnboardingState();
    const after = onboardingReducer(state, { type: "advance" });
    expect(after.index).toBe(0);
    expect(after.answers).toBe(state.answers);
  });

  it("advance() moves to the next step once the requirement is met", () => {
    const named = onboardingReducer(initialOnboardingState(), {
      type: "patch",
      partial: { name: "Maksym" },
    });
    const after = onboardingReducer(named, { type: "advance" });
    expect(after.index).toBe(1);
  });

  it("clamps at the last step — advance() never runs past 'first'", () => {
    const last = ONBOARDING_STEPS.length - 1;
    const state = onboardingReducer(initialOnboardingState(last), {
      type: "advance",
    });
    expect(state.index).toBe(last);
  });

  it("clamps at the first step — back() never runs before 'you'", () => {
    const state = onboardingReducer(initialOnboardingState(), {
      type: "back",
    });
    expect(state.index).toBe(0);
  });

  it("going back keeps what was entered", () => {
    let state = initialOnboardingState();
    state = onboardingReducer(state, {
      type: "patch",
      partial: { name: "Maksym" },
    });
    state = onboardingReducer(state, { type: "advance" }); // -> hours
    state = onboardingReducer(state, {
      type: "patch",
      partial: { hoursStart: "08:00", hoursEnd: "17:00" },
    });
    state = onboardingReducer(state, { type: "advance" }); // -> view
    state = onboardingReducer(state, {
      type: "patch",
      partial: { view: "columns" },
    });
    state = onboardingReducer(state, { type: "back" }); // -> hours
    state = onboardingReducer(state, { type: "back" }); // -> you

    expect(state.index).toBe(0);
    expect(state.answers.name).toBe("Maksym");
    expect(state.answers.hoursStart).toBe("08:00");
    expect(state.answers.hoursEnd).toBe("17:00");
    expect(state.answers.view).toBe("columns");
  });

  it("goto jumps directly and clamps an out-of-range target", () => {
    const past = onboardingReducer(initialOnboardingState(), {
      type: "goto",
      index: 99,
    });
    expect(past.index).toBe(ONBOARDING_STEPS.length - 1);

    const before = onboardingReducer(initialOnboardingState(), {
      type: "goto",
      index: -5,
    });
    expect(before.index).toBe(0);
  });

  it("patch merges without dropping unrelated fields", () => {
    let state = initialOnboardingState();
    state = onboardingReducer(state, {
      type: "patch",
      partial: { name: "Maksym" },
    });
    state = onboardingReducer(state, {
      type: "patch",
      partial: { timeZone: "utc" },
    });
    expect(state.answers.name).toBe("Maksym");
    expect(state.answers.timeZone).toBe("utc");
  });
});

describe("onboardingCapturedCount", () => {
  it("counts only non-blank captures", () => {
    expect(onboardingCapturedCount(["Draft the brief", "", "  "])).toBe(1);
    expect(onboardingCapturedCount(["a", "b", "c"])).toBe(3);
    expect(onboardingCapturedCount(["", "", ""])).toBe(0);
  });
});
