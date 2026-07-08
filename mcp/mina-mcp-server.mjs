#!/usr/bin/env node

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_NAME = "mina-calendar";
const SERVER_VERSION = "0.3.0";

const baseUrl = (process.env.MINA_BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);
const connectToken = process.env.MINA_CONNECT_TOKEN;

const tools = [
  {
    name: "mina_create_task",
    description: "Create an auto-scheduled task in Mina via the connector API.",
    inputSchema: {
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        estimatedMinutes: { type: "number", minimum: 1 },
        deadline: {
          type: "string",
          description: "ISO 8601 deadline, also used as due date.",
        },
        priorityLevel: {
          type: "string",
          enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
        },
        energyRequired: {
          type: "string",
          enum: ["LOW", "MEDIUM", "HIGH"],
        },
        contextTag: { type: "string" },
      },
    },
  },
  {
    name: "mina_list_tasks",
    description: "List tasks from Mina through GET /api/connect/tasks.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "mina_schedule",
    description:
      "Run Mina scheduling and return the current schedule through POST /api/connect/schedule.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "mina_reschedule",
    description: "Run Mina rescheduling through POST /api/connect/reschedule.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

let buffer = Buffer.alloc(0);

process.stdin.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  readMessages().catch((error) => {
    sendError(
      null,
      -32603,
      error instanceof Error ? error.message : String(error)
    );
  });
});

function readMessages() {
  while (buffer.length > 0) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) return Promise.resolve();

    const header = buffer.subarray(0, headerEnd).toString("utf8");
    const lengthMatch = header.match(/Content-Length:\s*(\d+)/i);
    if (!lengthMatch) {
      buffer = Buffer.alloc(0);
      throw new Error("Missing Content-Length header");
    }

    const contentLength = Number(lengthMatch[1]);
    const messageStart = headerEnd + 4;
    const messageEnd = messageStart + contentLength;
    if (buffer.length < messageEnd) return Promise.resolve();

    const body = buffer.subarray(messageStart, messageEnd).toString("utf8");
    buffer = buffer.subarray(messageEnd);
    void handleMessage(JSON.parse(body));
  }

  return Promise.resolve();
}

async function handleMessage(message) {
  if (!("id" in message)) {
    return;
  }

  try {
    switch (message.method) {
      case "initialize":
        sendResult(message.id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        });
        return;
      case "tools/list":
        sendResult(message.id, { tools });
        return;
      case "tools/call":
        sendResult(message.id, await callTool(message.params));
        return;
      case "ping":
        sendResult(message.id, {});
        return;
      default:
        sendError(message.id, -32601, `Unknown method: ${message.method}`);
    }
  } catch (error) {
    sendError(
      message.id,
      -32603,
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function callTool(params = {}) {
  const name = params.name;
  const args = params.arguments || {};

  if (!connectToken) {
    throw new Error("MINA_CONNECT_TOKEN is required");
  }

  const endpoint = toolEndpoint(name);
  if (!endpoint) {
    throw new Error(`Unknown tool: ${name}`);
  }

  const response = await fetch(`${baseUrl}${endpoint.path}`, {
    method: endpoint.method,
    headers: {
      Authorization: `Bearer ${connectToken}`,
      "Content-Type": "application/json",
    },
    body: endpoint.method === "GET" ? undefined : JSON.stringify(args),
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { text };
  }

  if (!response.ok) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { status: response.status, error: payload },
            null,
            2
          ),
        },
      ],
    };
  }

  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
  };
}

function toolEndpoint(name) {
  switch (name) {
    case "mina_create_task":
      return { method: "POST", path: "/api/connect/tasks" };
    case "mina_list_tasks":
      return { method: "GET", path: "/api/connect/tasks" };
    case "mina_schedule":
      return { method: "POST", path: "/api/connect/schedule" };
    case "mina_reschedule":
      return { method: "POST", path: "/api/connect/reschedule" };
    default:
      return null;
  }
}

function sendResult(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function sendError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

function send(message) {
  const json = JSON.stringify(message);
  process.stdout.write(
    `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`
  );
}
