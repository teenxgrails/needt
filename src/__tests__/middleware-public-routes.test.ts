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
});
