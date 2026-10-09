# Design port — lane status

Lead branch: `port/lead-status`. Claude reviews and merges; lanes never merge.
Foundation verified: #77 (T01/T02) and #78 (T03/T04) merged into
`port/integration`; initial lane base `491b945333d273a1dee71d721ee32c30605e6648`.

| Lane | Card | PR | State | Blockers |
| --- | --- | --- | --- | --- |
| A / S2 | T05 Shell | — | Implementing S2 components | S1 V3Root shell mount and search hook |
| B / S3 | T06 Task | — | Implementing pure UI and derived labels | S1 task contract / parts and waits mapping; generated CSS motion corrections |
| C / S4 | T08 States | — | Implementing states and status mapping | Offline queue count and AI status data contracts |

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
4. T08: expose supported offline queue count and AI limit/down status through
   existing authorized hooks. Expired-trial status is already derivable:
   `/api/billing` retains `trialEndsAt` independently of `isTrial`.
5. Handoff checker fails on inherited
   `.agents/handoffs/20261009-claude-port-t03-t04.md`: `status: review` is outside
   validator's active/blocked/complete set. Owner must correct that handoff.

These gaps block full card acceptance; lanes continue independent components.
