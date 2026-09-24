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

  it("does not expose the retired design preview as a public route", async () => {
    const response = await middleware(
      new NextRequest("http://needt.test/design-preview")
    );

    const location = response.headers.get("location");
    expect(location).not.toBeNull();
    const redirect = new URL(location!);
    expect(redirect.pathname).toBe("/auth/signin");
    expect(redirect.searchParams.get("callbackUrl")).toBe("/design-preview");
  });
});
