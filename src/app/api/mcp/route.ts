import { NextRequest, NextResponse } from "next/server";

import { authenticateConnectorToken } from "@/services/connectors/auth";
import {
  type JsonRpcResponse,
  handleMcpMessage,
  parseErrorResponse,
} from "@/services/connectors/mcp/server";

import { publicAppUrl } from "@/lib/public-url";
import {
  accountRule,
  enforceRateLimits,
  ipRule,
} from "@/lib/security/rate-limit";

/**
 * Remote MCP endpoint (Streamable HTTP, stateless, JSON responses only).
 *
 *   claude mcp add --transport http needt https://use.needt.app/api/mcp \
 *     --header "Authorization: Bearer needt_…"
 *
 * The JSON-RPC layer is written by hand (`src/services/connectors/mcp/`):
 * stateless JSON mode needs only initialize, ping, tools/list and tools/call,
 * which is smaller than pulling in `@modelcontextprotocol/sdk` and its
 * express/zod@3.25 peer range.
 *
 * //todo OAuth 2.1 authorization (protected-resource metadata, dynamic client
 * registration, PKCE) so claude.ai custom connectors can connect without a
 * pasted token. Until then only the personal connector token is accepted.
 */

const ROUTE = "/api/mcp";
const MAX_BODY_BYTES = 256 * 1024;
const RATE_LIMIT_PER_MINUTE = 120;

function jsonRpcError(status: number, message: string, headers?: HeadersInit) {
  return NextResponse.json(
    { jsonrpc: "2.0", id: null, error: { code: -32000, message } },
    { status, headers }
  );
}

function unauthorized(request: NextRequest) {
  const metadata = publicAppUrl(
    "/.well-known/oauth-protected-resource",
    request
  ).toString();
  return jsonRpcError(401, "Unauthorized", {
    "WWW-Authenticate": `Bearer resource_metadata="${metadata}"`,
  });
}

function methodNotAllowed() {
  return jsonRpcError(405, "Method not allowed", { Allow: "POST" });
}

export async function GET() {
  return methodNotAllowed();
}

export async function DELETE() {
  return methodNotAllowed();
}

export async function POST(request: NextRequest) {
  // Browsers attach Origin; a page on another site must not drive this
  // endpoint even if it somehow holds a token (DNS-rebinding guard).
  const origin = request.headers.get("origin");
  if (origin && origin !== publicAppUrl("/", request).origin) {
    return jsonRpcError(403, "Forbidden origin");
  }

  const userId = await authenticateConnectorToken(
    request.headers.get("authorization")
  );
  if (!userId) return unauthorized(request);

  const limited = await enforceRateLimits(
    [
      ipRule(request, "mcp:ip", RATE_LIMIT_PER_MINUTE, 60),
      accountRule(userId, "mcp:user", RATE_LIMIT_PER_MINUTE, 60),
    ],
    { route: ROUTE, userId }
  );
  if (limited) return limited;

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return jsonRpcError(413, "Request too large");
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json(parseErrorResponse(), { status: 400 });
  }

  const ctx = { request, userId };
  const messages = Array.isArray(body) ? body : [body];
  const responses = (
    await Promise.all(messages.map((message) => handleMcpMessage(ctx, message)))
  ).filter((response): response is JsonRpcResponse => response !== null);

  if (!responses.length) return new NextResponse(null, { status: 202 });
  return NextResponse.json(Array.isArray(body) ? responses : responses[0]);
}
