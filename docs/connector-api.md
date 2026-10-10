# Connector API

Needt exposes a private per-user API for scripts, bots, n8n, and personal tools.
Each user generates their own token in Settings -> Connectors.

Use:

```http
Authorization: Bearer needt_...
Content-Type: application/json
```

## MCP (Claude Code, Claude Desktop, other agents)

The same token opens a remote MCP server at `/api/mcp` (Streamable HTTP,
stateless JSON; POST only).

1. Settings -> Personal API -> Generate token (shown once; rotating it
   disconnects every agent).
2. Connect:

```bash
claude mcp add --transport http needt https://use.needt.app/api/mcp \
  --header "Authorization: Bearer needt_REPLACE_ME"
```

Add `--header "x-workspace-id: <id>"` to work in a shared workspace. Clients
that only launch local processes can use the stdio bridge in `mcp/`.

| Tool                | What it does                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| `needt_search`      | Text search across tasks, projects, events, pages, habits, mail                                      |
| `needt_list`        | Paginated list by `type` (task, project, event, calendar, page, habit, mail); `limit` ≤ 50, `cursor` |
| `needt_get`         | One object in full by `type` and `id`                                                                |
| `needt_create_task` | `POST /api/connect/tasks`                                                                            |
| `needt_schedule`    | `POST` (or `GET` with `run: false`) `/api/connect/schedule`                                          |
| `needt_reschedule`  | `POST /api/connect/reschedule`                                                                       |
| `needt_control`     | `POST /api/connect/control`; every action the route accepts, deletes need `confirm: true`            |

Write tools run the connector routes in-process, so auth, workspace scoping
and confirmation rules are the routes' own. Requests are rate-limited per IP
and per user (120/min). OAuth for claude.ai connectors is not available yet.

## Create Task

```bash
curl -X POST http://localhost:3000/api/connect/tasks \
  -H "Authorization: Bearer needt_REPLACE_ME" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Process resale photos",
    "description": "Batch edit and upload",
    "estimatedMinutes": 80,
    "deadline": "2026-07-08T17:00:00.000Z",
    "priorityLevel": "HIGH",
    "energyRequired": "MEDIUM",
    "contextTag": "resale-photos"
  }'
```

The task is created as auto-scheduled and Needt immediately runs the deterministic scheduler.
The response includes the task plus `scheduledBlocks` when the task is split into multiple chunks.

## Read Schedule

```bash
curl http://localhost:3000/api/connect/schedule \
  -H "Authorization: Bearer needt_REPLACE_ME"
```

Response:

```json
{
  "generatedAt": "2026-07-07T21:00:00.000Z",
  "tasks": [
    {
      "id": "task_id",
      "title": "Process resale photos",
      "scheduledStart": "2026-07-08T09:00:00.000Z",
      "scheduledEnd": "2026-07-08T09:30:00.000Z",
      "scheduledBlocks": [
        {
          "start": "2026-07-08T09:00:00.000Z",
          "end": "2026-07-08T09:30:00.000Z",
          "chunkIndex": 0,
          "chunkCount": 3,
          "isFrozen": false
        }
      ]
    }
  ]
}
```

`POST /api/connect/schedule` runs the scheduler first, then returns the same schedule shape.

## List Tasks

```bash
curl http://localhost:3000/api/connect/tasks \
  -H "Authorization: Bearer needt_REPLACE_ME"
```

Response:

```json
{
  "generatedAt": "2026-07-08T10:00:00.000Z",
  "tasks": []
}
```

## Reschedule

```bash
curl -X POST http://localhost:3000/api/connect/reschedule \
  -H "Authorization: Bearer needt_REPLACE_ME"
```

## Webhooks

Settings -> Connectors can send best-effort POSTs for:

- `schedule.changed`
- `task.completed`

Payload:

```json
{
  "event": "schedule.changed",
  "createdAt": "2026-07-07T21:00:00.000Z",
  "payload": {
    "taskCount": 4
  }
}
```

This API is private and user-scoped. A token can access only its owner's data;
it is not an unauthenticated public integration platform.
