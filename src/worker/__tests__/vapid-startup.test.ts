import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("worker VAPID startup warning", () => {
  const source = readFileSync(
    join(process.cwd(), "src/worker/index.ts"),
    "utf8"
  );

  it("checks VAPID configuration when the worker starts", () => {
    expect(source).toContain(
      "async function start(): Promise<void> {\n  await warnIfVapidConfigurationIsMissingOnce();"
    );
  });
});
