# 04 — Pages

**Model:** GPT-5.6 Terra High for the editor; the access-control and
collaboration-token tasks (4.5, 4.6) are **Sol High**.

**Prerequisite:** plan 02 deployed — page permissions inherit from workspace
roles.

**Status:** complete (2026-08-08).

## Context — the editor already exists, extend it

Verified in the repository:

- `src/components/documents/BlockIdentity.ts` — the ProseMirror plugin that
  guarantees unique block IDs across split, paste, duplicate, drag and undo.
- `src/components/documents/document-contract.ts` — the shared document shape.
- `documentFormatVersion` v1/v2, wired through `src/app/(app)/today/page.tsx:15`
  and `src/app/(app)/pages/[id]/page.tsx:17`.
- A server-controlled `editorV2` flag already gates the new format per user.
- Tiptap 3 is installed; there is no Novel package and none is needed.

**Do not build a second editor.** Every task below extends this stack.

## Collaboration backend

Self-hosted **Hocuspocus v4** (MIT, Node 22+), the reference Yjs WebSocket
backend for Tiptap. It runs beside the existing worker, persists to Postgres
through Prisma, and can use the existing Redis to scale. Liveblocks was
rejected: paid per-MAU SaaS that would physically store page content on third
party infrastructure, which contradicts Needt's own rule that private pages are
excluded even from our AI context.

Verify the current Hocuspocus API, peer dependencies and license through
Context7 before installing.

## Non-goals

- No second document architecture, no replacement of `BlockIdentity`.
- No page content stored outside Needt's own database.
- No AI provider beyond the existing AI layer.

## Tasks

### 4.1 Page tree

Workspace → folder/project → page → subpage. A fast flat list for quick
capture, a full editor for documents.

*Validate:* `npm run test:unit -- pages && npm run test:e2e -- pages`

### 4.2 Editor features

Slash commands, Markdown shortcuts, tables, checklists, mentions, backlinks,
attachments, cover and icon, autosave with explicit Saving/Saved/Error/Offline
states, and version history. All on the existing `documentFormatVersion`
contract, with lazy conversion for older documents.

*Validate:* `npm run test:unit -- page-document` and an autosave test covering rapid edits and offline retry

### 4.3 Inline entities

An inline task or project creates a real workspace entity. Removing the block
from a page never deletes that entity.

*Validate:* `npm run test:e2e -- pages` asserting the entity survives block removal

### 4.4 AI actions

Rewrite, summarize, critique through the existing Needt AI layer. Changes are
always presented as a proposal with accept/reject; private pages stay excluded
from AI context.

*Validate:* `npm run test:unit -- ai-proposals`

### 4.5 Page permissions — Sol High

Full Access / Editor / Viewer per page. A direct grant overrides the inherited
workspace role. Resolution happens server-side on every request.

*Validate:* `npm run test:e2e -- page-permissions` including API-level attempts to bypass with a valid session but no grant

### 4.6 Realtime collaboration — Sol High

Hocuspocus for presence, cursors and sync. Workspace and page authorization is
checked **before** a connection token is issued; a document ID is never itself
permission. Tokens are short-lived and scoped to one document.

*Validate:* concurrency test proving no lost updates, plus a test that a non-member cannot open a socket with a guessed document ID

### 4.7 Publishing

Publishing produces a separate read-only link. Unpublishing invalidates it
immediately, including any active session holding it.

*Validate:* `npm run test:e2e -- publishing`

### 4.8 Mobile

Slash menu as an anchored menu or bottom sheet; drag handle on long-press
(~350 ms) without fighting scroll; bubble toolbar that never covers the
selection. Check 360×800, 390×844 and 768.

*Validate:* `npm run test:e2e -- pages-mobile && npm run test:visual`

### 4.9 Performance

A 500-block document: warm interactive within 1.5 s, keystroke p95 under 50 ms,
autosave never blocking input, images loaded separately from the document JSON.

*Validate:* recorded measurement attached to the PR notes

**Recorded baseline (2026-08-08):** the deterministic Jest/jsdom warm-path
benchmark in `src/components/pages/__tests__/page-performance.test.ts` creates
the same Tiptap core used by Pages with 500 canonical blocks, then measures 30
input mutations across five warm samples. The full unit-suite run recorded warm
p95 **62.4 ms** and keystroke p95 **3.6 ms** (`npm run test:unit -- --runInBand
src/components/pages/__tests__/page-performance.test.ts`), below the 1.5 s and
50 ms targets. Autosave remains queued through `PageAutosave`, and
`ImageExtension.configure({ allowBase64: false })` keeps image bytes out of the
document JSON.

## Definition of done

Gates from `AGENTS.md`, Apache-2.0/MIT attribution for any adapted third-party
code, `CHANGELOG.md` updated, one scoped commit per task, green CI. No push, no
deploy.
