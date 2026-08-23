import { GET } from "@/app/api/health/route";

import { getMigrationStatus } from "@/lib/health/migrations";

jest.mock("@/lib/health/migrations", () => ({
  getMigrationStatus: jest.fn(),
}));

const mockGetMigrationStatus = jest.mocked(getMigrationStatus);

describe("GET /api/health", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.NEEDT_BUILD_SHA = "health-test-sha";
  });

  afterAll(() => {
    delete process.env.NEEDT_BUILD_SHA;
  });

  it("reports a healthy database when every packaged migration succeeded", async () => {
    mockGetMigrationStatus.mockResolvedValue({ pending: [] });

    const response = await GET();

    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      db: "ok",
      buildSha: "health-test-sha",
    });
  });

  it("fails closed without exposing pending migration names", async () => {
    mockGetMigrationStatus.mockResolvedValue({
      pending: ["20260823000000_internal_migration"],
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      db: "migrations-pending",
      buildSha: "health-test-sha",
    });
    expect(body).not.toHaveProperty("pending");
    expect(JSON.stringify(body)).not.toContain("internal_migration");
  });

  it("fails closed without exposing a database exception", async () => {
    mockGetMigrationStatus.mockRejectedValue(
      new Error("password=not-for-health-output")
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      db: "error",
      buildSha: "health-test-sha",
    });
    expect(JSON.stringify(body)).not.toContain("password=");
  });
});
