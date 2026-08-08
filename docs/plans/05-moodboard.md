# 05 — Moodboard

**Model:** GPT-5.6 Terra High for the canvas; task 5.2 (authorization and room
tokens) is **Sol High**.

**Prerequisites:** plan 02 deployed (workspace roles) and plan 04 shipped — the
collaboration server, token issuing and presence built there are reused here
rather than duplicated.

**Status:** 5.2–5.3 server foundation complete (2026-08-08). Canvas-level E2E
coverage remains blocked on 5.1; 5.1 and 5.4–5.6 are not started.

## Context

- Excalidraw is MIT licensed and provides the canvas, import and export.
- Collaboration reuses the **self-hosted Hocuspocus** setup from plan 04. Do
  not add a second realtime provider or a paid SaaS.
- Verify the current Excalidraw React API, its Yjs binding, peer dependencies
  and license through Context7 before installing. Excalidraw's own collaboration
  server is a separate component — confirm which integration path is current
  before committing to one.

## Non-goals

- No second realtime stack alongside the one from plan 04.
- No board content stored outside Needt's database.
- No parent transform animation wrapping the canvas — it breaks pointer
  coordinates (see plan 03).

## Tasks

### 5.1 Canvas

Excalidraw embedded in the workspace: images, sticky notes, arrows, freehand
drawing, undo/redo, zoom, export to PNG/SVG/JSON.

_Validate:_ `npm run test:e2e -- moodboard` covering create, edit, reload, export

### 5.2 Authorization and tokens — Sol High

Workspace membership and board role are resolved server-side **before** a
connection token is issued. A room or document ID is never permission by
itself. Tokens are short-lived and scoped to one board.

**Status:** server complete (2026-08-08). Membership and board access are
rechecked at socket authentication; guessed-room and expired/tampered-token
tests are in place. Full route E2E follows the 5.1 creation flow.

_Validate:_ `npm run test:e2e -- moodboard-access` including an attempt to connect with a valid session but no membership, and with a guessed room ID

### 5.3 Roles

Full Access / Editor / Viewer, consistent with pages. Viewer cannot mutate the
document through the socket, not merely through the UI.

**Status:** server complete (2026-08-08). Direct roles override inherited
workspace roles, creator access is fixed, and Hocuspocus rejects Viewer Yjs
updates before applying them to the document.

_Validate:_ a socket-level test asserting a Viewer's mutation is rejected server-side

### 5.4 Collaboration

Presence and cursors through the shared realtime layer. Concurrent edits must
not lose updates or duplicate elements.

_Validate:_ concurrency test with two simultaneous editors

### 5.5 Persistence and recovery

The realtime document is the live source of truth; Needt stores board metadata
and periodic snapshots in its own database for recovery and export. A snapshot
must be restorable into a working board.

_Validate:_ restore test — snapshot, corrupt the live doc, restore, compare element counts

### 5.6 Mobile

Usable at 360 px: toolbar reachable, no horizontal overflow, touch targets at
least 44 px, safe areas respected.

_Validate:_ `npm run test:e2e -- moodboard-mobile && npm run test:visual`

## Definition of done

Gates from `AGENTS.md`, third-party attribution recorded, `CHANGELOG.md`
updated, one scoped commit per task, green CI. No push, no deploy.

## After the five plans

Ideas parked deliberately, not scheduled: team workload heatmap, "why was this
scheduled here" explanations, what-if simulation, grouped unread centre,
approval gates between stages, global backlinks, recurring-series exceptions,
workspace export/import, action history with safe undo, cross-workspace
overview without exposing content.
