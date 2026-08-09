import { readFileSync } from "node:fs";

const serviceWorker = readFileSync("public/sw.js", "utf8");

describe("offline privacy and replay contract", () => {
  it("partitions private caches and IndexedDB records by version, user and workspace", () => {
    expect(serviceWorker).toContain(
      'const PRIVATE_CACHE_PREFIX = "needt-private-v5:"'
    );
    expect(serviceWorker).toContain(
      "`${OFFLINE_SCHEMA_VERSION}:${scope.userId}:${scope.workspaceId}`"
    );
    expect(serviceWorker).toContain("scopeKey: activeScope.key");
    expect(serviceWorker).toContain(
      'headers.set("x-workspace-id", activeScope.workspaceId)'
    );
  });

  it("purges private caches, snapshots, queues and drafts on identity cleanup", () => {
    expect(serviceWorker).toContain("key.startsWith(PRIVATE_CACHE_PREFIX)");
    expect(serviceWorker).toContain("await clearStore(db, STORE_QUEUE)");
    expect(serviceWorker).toContain("await clearStore(db, STORE_SNAPSHOTS)");
    expect(serviceWorker).toContain("await clearStore(db, STORE_META)");

    const userMenu = readFileSync(
      "src/components/navigation/UserMenu.tsx",
      "utf8"
    );
    const accountSettings = readFileSync(
      "src/components/settings/AccountSettings.tsx",
      "utf8"
    );
    expect(userMenu).toContain("await clearNeedtOfflineData();");
    expect(accountSettings).toContain("await clearNeedtOfflineData();");
    const offlineClient = readFileSync("src/lib/pwa/offline-client.ts", "utf8");
    expect(offlineClient).toContain('"task-data-storage"');
    expect(offlineClient).toContain('"project-store"');
    expect(offlineClient).toContain('"focus-timer-storage"');
    expect(offlineClient).toContain('"fluid_calendar_logs"');
  });

  it("queues only explicit offline-safe mutations", () => {
    expect(serviceWorker).toContain("const OFFLINE_MUTATIONS = [");
    expect(serviceWorker).toContain(
      "pattern: /^\\/api\\/pages\\/[^/]+\\/blocks\\/?$/"
    );
    expect(serviceWorker).toContain("pattern: /^\\/api\\/daily-agenda\\/?$/");
    expect(serviceWorker).not.toContain("MUTATION_METHODS.has(request.method)");
    expect(serviceWorker).not.toContain("pattern: /^\\/api\\/tasks\\/?$/");
  });

  it("deletes queued work only after accepted 2xx responses", () => {
    expect(serviceWorker).toContain(
      "response.status >= 200 && response.status < 300"
    );
    expect(serviceWorker).toContain("response.status === 401");
    expect(serviceWorker).toContain("response.status === 403");
    expect(serviceWorker).toContain("response.status === 409");
    expect(serviceWorker).toContain("response.status >= 500");
    expect(serviceWorker).toContain('? "sign_in_required"');
    expect(serviceWorker).toContain('? "conflict"');
    expect(serviceWorker).toContain(
      '["pending", "retry", "syncing", "sign_in_required"].includes'
    );
  });

  it("stores idempotency and base-revision metadata for replay", () => {
    expect(serviceWorker).toContain('headers.set("x-idempotency-key"');
    expect(serviceWorker).toContain("idempotencyKey,");
    expect(serviceWorker).toContain("baseRevision:");
    expect(serviceWorker).toContain('headers.get("if-match")');
  });
});
