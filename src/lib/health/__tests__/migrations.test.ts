import { getMigrationStatus } from "@/lib/health/migrations";

describe("migration health status", () => {
  it("reports packaged migrations without a successful database row as pending", async () => {
    await expect(
      getMigrationStatus({
        getPackagedMigrationNames: async () => [
          "20260801000000_first",
          "20260802000000_second",
        ],
        getAppliedMigrationNames: async () => ["20260801000000_first"],
      })
    ).resolves.toEqual({ pending: ["20260802000000_second"] });
  });

  it("does not count rolled-back or incomplete migrations as successful", async () => {
    await expect(
      getMigrationStatus({
        getPackagedMigrationNames: async () => ["20260801000000_first"],
        getAppliedMigrationNames: async () => [],
      })
    ).resolves.toEqual({ pending: ["20260801000000_first"] });
  });
});
