# Stranded branch disposition

`feat/timer`, `feat/mobile`, and `feat/board` were cut from
`5ba18935e269ff44fff9e9128d59ed3c5018c63e` and must not be rebased into the
current product line.

- `feat/timer`: useful contracts and tests were already superseded by the
  server-owned Focus session, timer store, active-session API, accessibility
  countdown, completion flow, and new strictness/exit protocol on main.
- `feat/mobile`: bottom sheet, PWA registration, mobile top bar, safe-area
  layout, and mobile Today patterns already exist in the current tree. The
  remaining acceptance target is 360px Focus/editor coverage, not a branch
  merge.
- `feat/board`: board schema, position tests, API, store, and canvas are already
  present in the current tree.

The branches are marked **superseded**. Keep them until final verification, then
delete them only as an explicit maintenance action.

## Explicitly deferred

- Project timeline/Gantt — `v0.2.0`, after dependency-model stabilization.
- Site/app blocking — desktop milestone after `v0.1.0`.
- Team round-robin and collective booking availability — team/SaaS milestone
  after `v0.2.0`.
- Old editor schema/field removal — after one full fallback release.
- Full Google/Outlook realtime webhooks — after Google domain verification and
  Microsoft Graph admin consent.
