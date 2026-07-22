# Project state

Updated: 2026-07-22

## Current outcome

Finish the actual **Needt v0.1 personal product** before calling it a beta. The
production foundation is stable, but core screens still need functional and visual
completion. Route availability is not acceptance evidence.

## Status

- Completed:
  - Production infrastructure: Coolify web + worker, managed PostgreSQL + Redis,
    migration history, health endpoint, and matching deployed SHA.
  - Core technical foundations exist: canonical tasks, deterministic scheduler,
    Today agenda storage, Focus session APIs, Board models, Mail APIs/worker,
    settings persistence, responsive shell, PWA base, and design tokens.
  - Docker startup fix pins the Prisma 6 CLI instead of downloading Prisma 7.
- Active:
  - Today implementation is functionally complete; its targeted automated visual
    run remains pending because the local Playwright browser binary is unavailable.
  - The product remains pre-RC; deployment stability is not release readiness.
- Verify:
  - Today still needs the checked-in Playwright matrix to run in an environment
    with Chromium before P1 can be closed.
  - Workspace has buggy/unfinished Space, List, Timeline, and cross-view behavior.
  - Focus currently exposes only a circular timer and one primary action; the
    preserved task/session functions are not assembled into a complete experience.
  - Boards has functional and design defects; secondary views are not proven.
  - Settings desktop content is incorrectly centered and several sections remain
    unfinished or unclear.
  - Mail has not passed a live Gmail/Outlook/IMAP product-flow test.
  - Whole-app GUI coherence, both themes, mobile/PWA smoothness, and interaction
    quality have not passed a serious visual/functional audit.
- Blocked:
  - Live Mail/provider verification needs the owner to authorize the relevant
    Gmail/Outlook/iCloud accounts when that phase begins.

## Next action

**Owner: Codex.** Run the focused Today Playwright matrix when Chromium is
available, review its dark/light desktop/tablet/mobile screenshots, and close P1
if no visual regression is found.

Inputs: the existing Today references and requirements already captured in this
project; use production only for a final targeted smoke after local implementation.

Done condition: Today passes create/edit/date/duration/complete, `/task`, per-day
history, reload persistence, desktop timeline, mobile layout, both themes, and has
no known high/medium visual defect.

## Open decisions

- The release candidate does not exist yet; do not tag or advertise v0.1 until
  P1-P7 and the real release gate are complete.
