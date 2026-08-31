import { classifyCredentialAttempt } from "@/lib/auth/credential-attempt";

describe("classifyCredentialAttempt", () => {
  it("counts a rejected password as a failed attempt", () => {
    expect(classifyCredentialAttempt(401, "", "")).toBe("failed");
    expect(
      classifyCredentialAttempt(302, "/auth/signin?error=CredentialsSignin", "")
    ).toBe("failed");
    expect(
      classifyCredentialAttempt(200, "", '{"error":"CredentialsSignin"}')
    ).toBe("failed");
  });

  it("counts a clean sign-in as a success", () => {
    expect(
      classifyCredentialAttempt(200, "", '{"url":"http://localhost:3000"}')
    ).toBe("succeeded");
  });

  it("does not blame the user when our own infrastructure fails", () => {
    // The rate limiter returns 503 when Redis is unreachable or when
    // RATE_LIMIT_HASH_SECRET is missing. Treating that as a wrong password
    // locked real accounts out after five attempts nobody actually made.
    expect(
      classifyCredentialAttempt(
        503,
        "",
        '{"error":"This action is temporarily unavailable."}'
      )
    ).toBe("inconclusive");
    expect(classifyCredentialAttempt(500, "", "")).toBe("inconclusive");
    expect(classifyCredentialAttempt(502, "", "")).toBe("inconclusive");
  });

  it("does not let a server error clear the strikes already recorded", () => {
    // Otherwise an attacker could reset their own counter by provoking errors
    // between guesses.
    expect(classifyCredentialAttempt(503, "", "")).not.toBe("succeeded");
  });
});
