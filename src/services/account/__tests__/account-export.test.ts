import { hashAccountExportToken } from "@/services/account/account-export";
import { createHash } from "node:crypto";

describe("account export download tokens", () => {
  it("stores only a deterministic SHA-256 digest", () => {
    const token = "one-use-export-token";
    const digest = hashAccountExportToken(token);

    expect(digest).toBe(createHash("sha256").update(token).digest("hex"));
    expect(digest).not.toContain(token);
    expect(digest).toHaveLength(64);
  });
});
