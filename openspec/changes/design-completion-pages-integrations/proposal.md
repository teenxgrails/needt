# Design completion: Today, Pages, Settings and Integrations

## Why

The relanded planner features work, but Today, legacy task Boards, Settings controls, integrations and deployment still use competing product models and inconsistent interaction contracts.

## What changes

- Replace product-facing Boards with personal Pages and databases while retaining legacy rows for later export.
- Finish Today as a race-safe document plus a narrow synchronized day timeline and explicit evening review.
- Make shared pickers/tokens and normal Settings controls autosave consistently.
- Add a searchable integration catalog with native providers and an optional Composio adapter.
- Add private bug reports with best-effort GitHub sync and publish immutable images through GHCR.

## Non-goals

- Realtime collaboration, public Pages, comments and team sharing.
- A parallel task model or scheduling-engine changes.
- Deleting legacy Board records.
