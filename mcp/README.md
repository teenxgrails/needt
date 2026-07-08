# Mina MCP Server

This stdio MCP server wraps Mina's existing connector API. It does not duplicate scheduling logic; every tool calls `/api/connect/*` with a personal bearer token.

## Environment

```bash
MINA_BASE_URL=http://localhost:3000
MINA_CONNECT_TOKEN=mina_REPLACE_ME
```

Generate the token in Mina: Settings -> Connectors.

## Tools

- `mina_create_task` -> `POST /api/connect/tasks`
- `mina_list_tasks` -> `GET /api/connect/tasks`
- `mina_schedule` -> `POST /api/connect/schedule`
- `mina_reschedule` -> `POST /api/connect/reschedule`

## Run

```bash
pnpm mcp:mina
```

## Claude Desktop

Add this to `claude_desktop_config.json`, adjusting the repo path and token:

```json
{
  "mcpServers": {
    "mina": {
      "command": "node",
      "args": ["/Users/lol/MinaCalendar/mcp/mina-mcp-server.mjs"],
      "env": {
        "MINA_BASE_URL": "http://localhost:3000",
        "MINA_CONNECT_TOKEN": "mina_REPLACE_ME"
      }
    }
  }
}
```

For production, set `MINA_BASE_URL` to the deployed Vercel URL and use a token generated in that environment.
