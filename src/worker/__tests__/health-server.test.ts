import {
  startWorkerHealthServer,
  stopWorkerHealthServer,
} from "@/worker/health-server";
import type { AddressInfo } from "node:net";

describe("worker release health", () => {
  const originalHost = process.env.WORKER_HEALTH_HOST;

  afterAll(() => {
    if (originalHost === undefined) delete process.env.WORKER_HEALTH_HOST;
    else process.env.WORKER_HEALTH_HOST = originalHost;
  });

  it("binds only to loopback by default", async () => {
    delete process.env.WORKER_HEALTH_HOST;
    const server = await startWorkerHealthServer({
      buildSha: "worker-test-sha",
      port: 0,
    });

    try {
      expect((server.address() as AddressInfo).address).toBe("127.0.0.1");
    } finally {
      await stopWorkerHealthServer(server);
    }
  });

  it("reports the running worker build SHA", async () => {
    const server = await startWorkerHealthServer({
      buildSha: "worker-test-sha",
      host: "127.0.0.1",
      port: 0,
    });

    try {
      const { port } = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${port}/health`);

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        ok: true,
        service: "worker",
        buildSha: "worker-test-sha",
      });
    } finally {
      await stopWorkerHealthServer(server);
    }
  });
});
