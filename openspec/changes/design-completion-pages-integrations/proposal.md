# Design completion: Today, Pages, Settings and Integrations

## Why

The relanded planner features work, but Today, legacy task Boards, Settings controls, integrations and deployment still use competing product models and inconsistent interaction contracts.

## What changes

- Replace product-facing Boards with personal Pages and databases while retaining legacy rows for later export.
- Finish Today as a race-safe document plus a narrow synchronized day timeline and explicit evening review.
- Make shared pickers/tokens and normal Settings controls autosave consistently.
- Add a searchable integration catalog with native providers and an optional Composio adapter.
- Add private bug reports with best-effort GitHub sync and publish immutable images through GHCR.
- Align desktop Settings navigation with mobile, add separate Gray and true Dark themes, and normalize every settings form around shared controls.
- Add named work schedules, task and recurring-task schedule assignment, and one-off flexible-hours overrides without replacing the deterministic scheduler.
- Upgrade Pages to a stable block reconciliation contract with assets, comments, templates, forms, functional database views, and explicit AI proposal review.
- Make Today use the shared Pages document contract while retaining task-aware nodes and an independently interactive day timeline.
- Unify Task and Event creation and render day overrides as calendar availability texture rather than synthetic events.

## Non-goals

- Realtime collaboration, public Pages and team sharing.
- A parallel task model or replacement scheduling engine.
- Deleting legacy Board records.
- Public form endpoints, anonymous uploads, or public asset sharing.
