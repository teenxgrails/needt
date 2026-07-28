const CACHE_NAME = "needt-shell-v4";
const API_CACHE_NAME = "needt-api-v2";
const DB_NAME = "needt-offline-v1";
const STORE_QUEUE = "mutationQueue";
const STORE_SNAPSHOTS = "snapshots";
const SHELL_URLS = [
  "/",
  "/today",
  "/calendar",
  "/focus",
  "/tasks",
  "/settings",
  "/manifest.webmanifest",
  "/logo.svg",
];
const SNAPSHOT_APIS = ["/api/tasks", "/api/connect/schedule"];
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter(
                (key) => key !== CACHE_NAME && key !== API_CACHE_NAME
              )
              .map((key) => caches.delete(key))
          )
        ),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (request.method === "GET" && request.mode === "navigate") {
    event.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }

  if (
    request.method === "GET" &&
    SNAPSHOT_APIS.some((api) => url.pathname.startsWith(api))
  ) {
    event.respondWith(snapshotFirst(request));
    return;
  }

  if (
    MUTATION_METHODS.has(request.method) &&
    url.pathname.startsWith("/api/")
  ) {
    event.respondWith(queueWhenOffline(request));
    return;
  }

  if (
    request.method === "GET" &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname === "/manifest.webmanifest" ||
      url.pathname === "/logo.svg")
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "needt-sync-queue") {
    event.waitUntil(flushQueue());
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "NEEDT_SYNC_NOW") {
    event.waitUntil(flushQueue());
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: "Needt", body: event.data?.text() ?? "Planner reminder" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Needt", {
      body: data.body || "Your planner has an update.",
      icon: "/logo.svg",
      badge: "/logo.svg",
      data: data.url || "/focus",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data || "/focus"));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached =
      (await cache.match(request)) ||
      (await cache.match("/today")) ||
      (await cache.match("/calendar"));
    return (
      cached ||
      new Response("Needt is offline. Reconnect and try again.", {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" },
      })
    );
  }
}

async function snapshotFirst(request) {
  try {
    const response = await fetch(request);
    const body = await response.clone().text();
    await putSnapshot(
      request.url,
      body,
      response.headers.get("content-type") || "application/json"
    );
    const cache = await caches.open(API_CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    const snapshot = await getSnapshot(request.url);
    if (snapshot) {
      return new Response(snapshot.body, {
        headers: {
          "content-type": snapshot.contentType,
          "x-needt-offline": "true",
        },
      });
    }
    return (
      (await caches.match(request)) ||
      new Response("[]", { headers: { "content-type": "application/json" } })
    );
  }
}

async function queueWhenOffline(request) {
  try {
    return await fetch(request.clone());
  } catch {
    const body = await request.clone().text();
    await enqueue({
      id: `${Date.now()}-${crypto.randomUUID()}`,
      url: request.url,
      method: request.method,
      headers: Array.from(request.headers.entries()),
      body,
      createdAt: Date.now(),
    });
    await self.registration.sync?.register("needt-sync-queue");
    return new Response(JSON.stringify({ queued: true, offline: true }), {
      status: 202,
      headers: { "content-type": "application/json" },
    });
  }
}

async function flushQueue() {
  const db = await openDb();
  const items = await getAll(db, STORE_QUEUE);
  for (const item of items.sort((a, b) => a.createdAt - b.createdAt)) {
    try {
      await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body || undefined,
      });
      await deleteItem(db, STORE_QUEUE, item.id);
    } catch {
      break;
    }
  }
}

async function putSnapshot(url, body, contentType) {
  const db = await openDb();
  await putItem(db, STORE_SNAPSHOTS, {
    url,
    body,
    contentType,
    updatedAt: Date.now(),
  });
}

async function getSnapshot(url) {
  const db = await openDb();
  return getItem(db, STORE_SNAPSHOTS, url);
}

async function enqueue(item) {
  const db = await openDb();
  return putItem(db, STORE_QUEUE, item);
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_QUEUE))
        db.createObjectStore(STORE_QUEUE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS))
        db.createObjectStore(STORE_SNAPSHOTS, { keyPath: "url" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function putItem(db, store, value) {
  return tx(db, store, "readwrite", (objectStore) => objectStore.put(value));
}

function getItem(db, store, key) {
  return tx(db, store, "readonly", (objectStore) => objectStore.get(key));
}

function getAll(db, store) {
  return tx(db, store, "readonly", (objectStore) => objectStore.getAll());
}

function deleteItem(db, store, key) {
  return tx(db, store, "readwrite", (objectStore) => objectStore.delete(key));
}

function tx(db, store, mode, operation) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const request = operation(transaction.objectStore(store));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
