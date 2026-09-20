import { oauthErrorMessage } from "@/lib/auth/oauth-error";

describe("OAuth error messages", () => {
  it("explains how to recover from an account mismatch", () => {
    expect(oauthErrorMessage("OAuthAccountNotLinked")).toContain(
      "method you used before"
    );
  });

  it("does not echo unknown provider errors", () => {
    expect(oauthErrorMessage("secret-provider-detail")).not.toContain(
      "secret-provider-detail"
    );
  });
});
