# Needt MCP Server

This stdio MCP server wraps Needt's existing connector API. It does not duplicate scheduling logic; every tool calls `/api/connect/*` with a personal bearer token.

## Environment

```bash
NEEDT_BASE_URL=http://localhost:3000
NEEDT_CONNECT_TOKEN=needt_REPLACE_ME
```

Generate the token in Needt: Settings -> Connectors.

## Tools

- `needt_create_task` -> `POST /api/connect/tasks`
- `needt_list_tasks` -> `GET /api/connect/tasks`
- `needt_schedule` -> `POST /api/connect/schedule`
- `needt_reschedule` -> `POST /api/connect/reschedule`
- `needt_control` -> private app control for overview, projects, task updates/completion, local calendars, and events. Destructive actions require `confirm: true`.

Use `action: "overview"` first to inspect the current app state. Then use
`create_project`, `update_project`, `update_task`, `complete_task`,
`create_calendar`, `create_event`, or `update_event`. Deletes are intentionally
blocked until the caller sends `confirm: true` with the delete action.

## Run

```bash
npm run mcp:needt
```

## Claude Desktop

Add this to `claude_desktop_config.json`, adjusting the repo path and token:

```json
{
  "mcpServers": {
    "needt": {
      "command": "node",
      "args": ["/path/to/Needt/mcp/needt-mcp-server.mjs"],
      "env": {
        "NEEDT_BASE_URL": "http://localhost:3000",
        "NEEDT_CONNECT_TOKEN": "needt_REPLACE_ME"
      }
    }
  }
}
```

For production, set `NEEDT_BASE_URL` to the deployed URL and use a token generated in that environment.
