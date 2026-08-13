const WORKSPACE_HEADER = "x-workspace-id";

const WORKSPACE_UNSCOPED_PATHS = new Set([
  "/api/auth",
  "/api/workspaces",
  "/api/workspace-invites",
]);

function isWorkspaceScopedApi(url: URL) {
  if (url.origin !== window.location.origin) return false;
  if (!url.pathname.startsWith("/api/")) return false;
  return ![...WORKSPACE_UNSCOPED_PATHS].some(
    (path) => url.pathname === path || url.pathname.startsWith(`${path}/`)
  );
}

/**
 * Adds the active workspace identifier to same-origin, workspace-owned API
 * requests without changing explicit callers or account-global endpoints.
 */
export function scopeWorkspaceRequest(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  workspaceId: string
): [RequestInfo | URL, RequestInit | undefined] {
  const url = new URL(
    input instanceof Request ? input.url : input.toString(),
    window.location.origin
  );
  if (!isWorkspaceScopedApi(url)) return [input, init];

  const headers = new Headers(
    input instanceof Request ? input.headers : init?.headers
  );
  if (headers.has(WORKSPACE_HEADER)) return [input, init];
  headers.set(WORKSPACE_HEADER, workspaceId);

  if (input instanceof Request) {
    return [new Request(input, { ...init, headers }), undefined];
  }
  return [input, { ...init, headers }];
}
