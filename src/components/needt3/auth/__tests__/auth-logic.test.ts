import {
  mailProblem,
  mailProblemText,
  passwordShort,
  refusalText,
  resendClock,
  submitLabel,
  submitStep,
} from "../auth-logic";

describe("email", () => {
  it("says nothing before the first Continue", () => {
    expect(mailProblem({ mail: "", touched: false })).toBeNull();
    expect(mailProblem({ mail: "nope", touched: false })).toBeNull();
  });
  it("asks for an address, then for an @", () => {
    expect(mailProblemText(mailProblem({ mail: "", touched: true }))).toBe(
      "Enter your email."
    );
    expect(mailProblemText(mailProblem({ mail: "ana", touched: true }))).toBe(
      "Include an @ in the address."
    );
    expect(mailProblem({ mail: "@x", touched: true })).toBe("shape");
    expect(mailProblem({ mail: "a@b", touched: true })).toBeNull();
  });
});

describe("password", () => {
  it("is short only once something is typed", () => {
    expect(passwordShort("")).toBe(false);
    expect(passwordShort("1234567")).toBe(true);
    expect(passwordShort("12345678")).toBe(false);
  });
});

describe("what the button does", () => {
  it("walks address, then password, then submits", () => {
    expect(submitStep({ mail: "", pass: "", withPass: false })).toBe(
      "ask-mail"
    );
    expect(submitStep({ mail: "a@b", pass: "", withPass: false })).toBe(
      "ask-password"
    );
    expect(submitStep({ mail: "a@b", pass: "short", withPass: true })).toBe(
      "ask-password"
    );
    expect(
      submitStep({ mail: "a@b", pass: "long enough", withPass: true })
    ).toBe("ready");
  });
  it("labels itself for the mode", () => {
    expect(submitLabel("login", false, false)).toBe("Continue");
    expect(submitLabel("login", true, false)).toBe("Sign in");
    expect(submitLabel("signup", true, false)).toBe("Create account");
    expect(submitLabel("signup", true, true)).toBe("Setting up your day…");
  });
});

describe("refusals", () => {
  it("prefers the server's own words", () => {
    expect(refusalText("wrong", "Too many attempts.")).toBe(
      "Too many attempts."
    );
    expect(refusalText("taken")).toMatch(/already has an account/);
    expect(refusalText("wrong")).toMatch(/do not match/);
    expect(refusalText(null)).toBeNull();
  });
  it("formats the resend countdown", () => {
    expect(resendClock(30)).toBe("0:30");
    expect(resendClock(7)).toBe("0:07");
    expect(resendClock(-1)).toBe("0:00");
  });
});
