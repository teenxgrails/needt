import { authSecret } from "@/lib/auth/auth-secret";

describe("authSecret", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSecret = process.env.NEXTAUTH_SECRET;

  afterEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", {
      configurable: true,
      value: originalNodeEnv,
    });
    if (originalSecret === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = originalSecret;
  });

  it("fails closed in production when NEXTAUTH_SECRET is missing", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      configurable: true,
      value: "production",
    });
    delete process.env.NEXTAUTH_SECRET;

    expect(() => authSecret()).toThrow(
      "NEXTAUTH_SECRET is required in production"
    );
  });

  it("uses the configured runtime secret", () => {
    process.env.NEXTAUTH_SECRET = "configured-secret";
    expect(authSecret()).toBe("configured-secret");
  });
});
