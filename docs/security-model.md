# Route access and threat model

This document records the authorization boundaries used by Needt. It is a
release-review aid, not a replacement for server-side checks in each route.

## Route access matrix

| Surface | Access decision | Data boundary | Primary recovery check |
| --- | --- | --- | --- |
| Auth callbacks | Provider state and same-origin callback validation | Account being authenticated | Reject invalid state and unsafe callback URLs |
| Public booking | Published booking slug only | Booking page and availability exposed by that page | Rate limit and avoid private calendar details |
| Public Pages | Unexpired publication token | Published page snapshot only | Revoke token immediately on publication removal |
| Authenticated workspace APIs | `authenticateRequest` then `resolveWorkspaceAccess` | `workspaceDataScopeWhere` for workspace-owned data | Reject unknown, removed or unpaid shared memberships |
| Workspace lifecycle | Owner/Editor role resolved server-side | Requested workspace membership | Protect the last Owner and re-check entitlement on every transition |
| Pages and Moodboards collaboration | Short-lived HMAC token plus live database reauthorization | Exact workspace, resource and room | Close revoked access with `4403`; never trust a room name alone |
| Offline replay | Authenticated user, workspace header, idempotency key and base revision | User/workspace/versioned private cache namespace | Keep failed requests as recovery states; never replay into another workspace |
| AI actions | Authenticated workspace access, tool schema and confirmation record | Workspace-scoped conversations, messages, memories, tasks, projects and Pages; account-global resources stay user-owned | Require confirmation for dangerous mutations and reject confirmation replay |
| Provider sync | Provider ownership, connected account ownership and workspace-scoped mapping | Provider account, selected list/feed and local mirror | Preserve local data on partial reads; expose `PENDING` or error state for retry |
| Admin operations | `requireAdmin` | Administrative data only | Never use hidden UI as authorization |

## Threat model

### Cross-workspace access

An attacker can submit a guessed `x-workspace-id`, query parameter, resource ID
or realtime room. Server routes must resolve the membership for the authenticated
user and apply `workspaceDataScopeWhere`; identifiers are selectors, never
proof of access. Viewer membership permits only reads. Shared membership also
requires the member's own PRO or LIFETIME plan.

### Browser persistence and stale sessions

Offline caches, queued mutations and drafts are private data. Their keys include
schema version, authenticated user and workspace. Workspace switching disables
the old queue; logout and account changes purge private cache, persisted store
and drafts. Rejected or conflicted mutations remain visible for recovery and
are not retried automatically. See [offline.md](offline.md).

### Public links and booking

Publication and booking identifiers are capabilities with the smallest possible
read surface. Public routes must not reveal private Page data, account data or
calendar event titles. Callback URLs are limited to safe relative same-origin
paths. Token/slug revocation must invalidate access without waiting for a cache
expiry.

### AI mutations

The model is untrusted input. The server validates every tool and resolves all
entity IDs within the active workspace. Dangerous actions require a stored,
one-use confirmation; archive is recoverable rather than physical deletion.
Tool payloads include canonical entity links so a user can review each change.
AI may request deterministic scheduling previews but cannot replace the
scheduler.

### Provider credentials and synchronization

Connected-account secrets remain runtime-only and are retrieved only after
ownership checks. Provider output is untrusted and must not override locally
owned planning fields. Sync identifiers include provider list/feed context;
partial reads must never delete local content. Outlook creates persist locally
as `PENDING` before refresh reconciliation so a delayed provider sync is
recoverable.

### Realtime collaboration

Hocuspocus tokens bind user, workspace, resource and room, but the server
reauthorizes current membership and role on connect, reconnect and each inbound
message. Removal, deactivation or entitlement loss closes the socket. See
[collaboration.md](collaboration.md).

## Release checklist additions

Before enabling a workspace-related release, smoke-test:

- signed-out booking, auth callback and public Page access;
- workspace switch, invite acceptance, role downgrade and member removal;
- logout cache purge and offline replay rejection after a workspace switch;
- AI confirmation/replay rejection and links to changed entities;
- provider credential ownership, partial-sync recovery and pending Outlook
  reconciliation;
- collaboration reconnect after role change or revocation.
