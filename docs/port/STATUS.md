# Design port — lane status

Lead branch: `port/lead-status`. Claude reviews and merges; lanes never merge.
Foundation verified: #77 (T01/T02) and #78 (T03/T04) merged into
`port/integration`; initial lane base `491b945333d273a1dee71d721ee32c30605e6648`.

| Lane | Card | PR | State | Blockers |
| --- | --- | --- | --- | --- |
| A / S2 | T05 Shell | — | Local cheap gates and browser harness checks pass; 12 PNGs captured | S1 root/search; remaining fidelity gaps; build interrupted for disk |
| B / S3 | T06 Task | — | Pure UI implemented; clean reinstall repairs ENOSPC-corrupt dependencies | S1 task contract / parts and waits mapping; generated CSS motion corrections |
| C / S4 | T08 States | — | Local cheap gates pass; screenshot and offline-scope checks | Unscoped queue messages unsafe across tabs; production consuming screen absent |

## Dependency checklist

- [x] Verify #77 and #78 merged before starting implementation.
- [x] Create separate worktrees and branches for lead and A/B/C.
- [ ] First PRs: T05, T06, T08; user local gates, screenshots and required CI.
- [ ] After Claude merges: A T10/T11 requires T05/T06/T08; B T07 requires T06;
  C T13/T14 requires T05/T08/T03.
- [ ] A T17–T20 requires T05/T08/T03; B T12 requires T06/T08/T04.
- [ ] B T21/T22 requires T05/T01/T08; C T15/T16 requires T06/T08/T03.
- [ ] For every next card recheck merged PRs, fetch integration, create a fresh
  worktree with its own dependencies; remove prior worktree only after merge,
  clean-state verification and preservation of useful evidence.

## Validation policy

Per user: local type-check, zero-warning lint, full unit suite, tokens:check and
build. PR CI security, quality-gates, schema-drift and e2e must pass.
Visual failures outside inherited `app-surfaces`, `settings-tabs`, `theme-modes`,
`secondary-surfaces`, `design-completion-states`, `boards-workspace` block.
Skipped visual jobs are not evidence of screenshot validation.
Screenshots: prototype and app, light/dark, 1440×900; card-specific widths/states.

## Tool limitations

- Context7 and Playwright MCP are not exposed in this session. Lanes must use
  official docs / installed Playwright CLI and record any unverified acceptance.
- Project handoff/tool-routing/Hallmark skill files were absent from the starting
  checkout; collaboration protocol and frozen prototype remain authoritative.
- Main checkout has foreign dirty work; no lead or lane writes there.

## Requests for S1 / Claude

1. T05: `src/components/needt3/root/V3Root.tsx:111` currently renders children
   directly. Mount S2 `V3Shell` when supplied by A. Export a typed search hook
   under `src/lib/needt3/hooks` calling the existing `/api/search` route;
   correct its Project link if project-detail routing is now supported.
   A can own the scoped portal context inside S2; no root portal API required.
2. T06: reconcile §2.2 `NeedtTask` with `map.ts:134` `V3Task` returned by
   `hooks/tasks.ts`. Existing mapped tasks omit parts/waits; provide real API
   mapping and specify supported completion semantics (not fake part writes).
3. Generated `src/styles/v3/tasks.css` retains prototype motion violations.
   Apply mandatory motion corrections through the S1 sync script, preserving
   tokens:check parity; lanes must not hand-edit generated files.
4. T08: existing billing hook preserves real usage fields at runtime, allowing
   validated S4 narrowing for AI exhaustion. Service-down/reset time are absent.
   Expired-trial status is derivable from retained `trialEndsAt`.
   `public/sw.js:399` filters global activeScope but broadcasts count to every
   tab with no scope in the payload. A second workspace tab can therefore send
   its count to the first tab. S1 must add a validated scope to the payload or
   reply per client; S4 must reject unscoped/mismatched counts in the meantime.
5. Handoff checker fails on inherited
   `.agents/handoffs/20261009-claude-port-t03-t04.md`: `status: review` is outside
   validator's active/blocked/complete set. Owner must correct that handoff.

These gaps block full card acceptance; lanes continue independent components.

## Disk / lead verification checkpoint

- Lead docs commit `e26af1a` pushed to `origin/port/lead-status`; normal commit
  hooks passed zero-warning lint and type-check (Node 22).
- Disk reached 131 MiB free and lane B install / C Prisma failed ENOSPC.
  Removed regenerable npm cache and lead's own node_modules after its commit;
  free space recovered to about 2.1 GiB. Lane source and dependencies preserved.
- B retries install alone; Next builds will run one at a time.
- Browser evidence ports reserved: prototype 4408, A 4305, B 4306, C 4308.
  Component harness evidence must be labeled separately from authenticated app
  integration, which is not proven by screenshots of standalone components.
- Frozen prototype omits its requested DS bundle. Read-only server fallback uses
  original `Needt - Design : App, Landing/_ds/.../_ds_bundle.js`; matching frozen
  styles/task source verified by SHA256. S1 should vendor missing runtime asset
  for reproducible reference preview; no frozen files modified by lanes.
