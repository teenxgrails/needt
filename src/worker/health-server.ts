import { type Server, createServer } from "node:http";

export type WorkerHealthServerOptions = {
  buildSha?: string;
  host?: string;
  port?: number;
};

export async function startWorkerHealthServer(
  options: WorkerHealthServerOptions = {}
): Promise<Server> {
  const buildSha = options.buildSha ?? process.env.NEEDT_BUILD_SHA ?? "local";
  const host = options.host ?? process.env.WORKER_HEALTH_HOST ?? "0.0.0.0";
  const port = options.port ?? Number(process.env.WORKER_HEALTH_PORT ?? 1235);
  const server = createServer((request, response) => {
    if (
      request.method !== "GET" ||
      request.url?.split("?", 1)[0] !== "/health"
    ) {
      response.writeHead(404).end();
      return;
    }

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "worker", buildSha }));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  return server;
}

export async function stopWorkerHealthServer(server: Server | null) {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
