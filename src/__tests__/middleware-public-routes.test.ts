import { NextRequest } from "next/server";

import { middleware } from "@/middleware";

describe("public route middleware", () => {
  it("allows public booking routes without a sign-in redirect", async () => {
    const response = await middleware(
      new NextRequest("http://needt.test/book/intro-call")
    );

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("allows the email confirmation landing without a session", async () => {
    const response = await middleware(
      new NextRequest("http://needt.test/auth/confirm-email?token=example")
    );

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
