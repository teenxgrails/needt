import {
  startWorkerHealthServer,
  stopWorkerHealthServer,
} from "@/worker/health-server";
import type { AddressInfo } from "node:net";

describe("worker release health", () => {
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
