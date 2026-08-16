# 08 — GPT-5.6 Terra High track

**Status:** ready for T1 after Sol S1 starts; later tasks are dependency-gated.

This file contains only bounded work assigned to GPT-5.6 Terra High: test
infrastructure, public/auth flows, CI wiring, visual quality, product UI,
responsive behavior, copy and documentation. Terra must consume Sol's contracts
and must not invent replacement authorization, offline, realtime, editor or
scheduling architectures.

Every task gets its own reviewed commit. Use Hallmark for user-visible work.
Run humanize and then ai-check for new or rewritten user-facing copy.

## T1 — Public booking, auth and legal routes

**Prerequisite:** coordinate middleware/auth overlap with Sol S1. May otherwise
run in parallel.

- Admit `/book/:path*` through middleware without widening authenticated APIs.
- Honor only safe same-origin relative `callbackUrl`; fallback to `/calendar`.
- Show the configured Google and Microsoft sign-in providers.
- Add approved `/terms` and `/privacy` pages; draft legal copy requires owner
  review before release.
- Remove duplicated auth headings/card hierarchy at 320–768px.
- Give invalid/revoked public Pages stable `404`/`410` UI and metadata.

**Risk:** high. Prevent open redirects and accidental public route expansion.

**Done when:** signed-out booking works and every auth/legal/public link has a
deliberate loading, success and failure state.

```bash
npm run test:e2e -- tests/e2e/auth.spec.ts tests/e2e/booking.spec.ts tests/e2e/public-pages.spec.ts
npm run check:branding
npm run check:ui-contracts
npm run type-check
npm run lint
```

## T2 — Reproducible E2E environment

**Prerequisite:** none. May run with T1.

- Start compatible PostgreSQL and Redis for E2E and apply all migrations first.
- Fail setup immediately when required tables are missing.
- Fix the current Moodboard loading, blank Pages main and workspace invite test.
- Keep production rate limiting fail-closed; tests must use Redis rather than
  bypassing the limiter.
- Keep seed users, memberships and cleanup deterministic.

**Done when:** full E2E runs from a clean checkout without hidden failures,
environment-dependent skips or retry-masked regressions.

```bash
npm run test:e2e
git status --short
```

## T3 — CI, Docker and collaboration gates

**Prerequisite:** Sol S4 defines/fixes the collaboration runtime and smoke test.

- Add `build:collaboration` and collaboration smoke to CI and release gates.
- Build app, worker and collaboration server from the same SHA.
- Ensure the production Docker image contains the validated collaboration
  artifact without exposing build-time secrets.
- Update release documentation with the complete build sequence.

```bash
npm run build
npm run build:worker
npm run build:collaboration
docker build -f docker/production/Dockerfile .
```

## T4 — Hallmark visual-contract cleanup

**Prerequisite:** T1 and T2 functional routes. May run while Sol S3/S4 continue.

- Remove AI companion glow, blur and radial spectacle; reduce its visual weight.
- Prevent companion, dock, keyboard toolbar and billing/focus content overlap;
  respect safe-area insets.
- Make touch targets at least 44x44px at 320, 360, 390 and 768px.
- Standardize navigation terms: Tasks, Projects, Moodboards, Pages, Workspace.
- Gate `/style` behind admin in production while preserving the design lab.
- Extend UI-contract checks for prohibited effects, undersized fixed actions and
  unsafe fixed-layer collisions.
- Replace generic copy with concrete action/state language.

**Done when:** no overlap or horizontal overflow exists across the viewport
matrix and Calendar remains the visual source of truth.

```bash
npm run check:branding
npm run check:ui-contracts
npm run test:style
npm run test:visual
npm run type-check
npm run lint
```

## T5 — Workspace product UI

**Prerequisite:** Sol S5 green, hardening deployed, and Sol S6 contract complete.

- Add a workspace switcher with explicit personal/shared/current states.
- Implement create, pending invites, accept/decline, members, role changes,
  revoke, leave and last-Owner safeguards using S6 APIs/types.
- Invalidate scoped queries, client state and realtime rooms on switch using the
  S6 lifecycle; do not create a second workspace store.
- Add workspace Settings and onboarding; explain entitlement failures beside
  unavailable actions.
- Verify Owner/Editor/Viewer and FREE/PRO/LIFETIME on desktop/tablet/mobile.

**Risk:** high. Stale previous-workspace data is a release blocker.

**Done when:** every role completes only allowed flows and workspace switching
leaves no prior data, rooms or optimistic mutations visible.

```bash
npm run test:e2e -- tests/e2e/workspaces.spec.ts tests/e2e/onboarding.spec.ts
npm run test:style
npm run test:visual
npm run type-check
npm run lint
```

## T6 — Pages Notes-first UI

**Prerequisite:** Sol S7 editor/data contract complete.

- Replace landing cards with a fast notes list: recent, pinned, folders, tags,
  shared and trash, with search and New Note always accessible.
- Desktop: selection toolbar, contextual slash menu, keyboard shortcuts and
  conditional drag handles.
- Mobile: native selection and persistent 44px toolbar above the software
  keyboard for formatting, lists, checklist, indent, undo/redo and insert.
- Add device attachments and upload states; URL covers remain optional.
- Surface comments, activity, version history, collaborators, offline state and
  conflicts without nesting unrelated actions.
- Keep databases/entities secondary rather than the default Pages entry point.

**Risk:** high. Do not replace native selection with custom gesture handling.

**Done when:** touch/mouse/keyboard editing works, keyboard/dock do not overlap,
attachments work, and conflict handling never loses text.

```bash
npm run test:unit -- --runInBand src/components/pages
npm run test:e2e -- tests/e2e/pages.spec.ts
npm run test:style
npm run test:visual
npm run type-check
npm run lint
```

## T7 — Route completion

**Prerequisite:** T4, T5 and T6. Split each numbered route group into its own
commit and review screenshots before updating baselines.

1. **Today:** resilient cached agenda, retry/sync state, capacity warning and
   defer flow without duplicating existing planning/review rituals.
2. **Tasks, Projects and Space:** 44px actions, quick capture/find, useful empty
   states and functional summaries instead of decorative orb language.
3. **Focus:** remove dock collisions; prioritize the current session and explain
   analytics requirements concretely.
4. **Moodboards:** recent/list/search and purposeful empty state; templates wait
   until loading and persistence are reliable.
5. **Mail:** clarify navigation; add Snooze/Remind Me and focused splits only
   after a reviewed backend contract exists.
6. **Settings, billing and onboarding:** searchable settings, workspace section,
   responsive billing and account -> calendar -> workspace -> first-task flow.

**Done when:** no primary route has blank/error-only screens, overlap, horizontal
overflow, inconsistent names or unexplained disabled actions.

**Validate each route commit:**

```bash
npm run test:e2e
npm run check:branding
npm run check:ui-contracts
npm run test:style
npm run test:visual
npm run type-check
npm run lint
```

## T8 — Product UI after Sol contracts

**Prerequisite:** Sol S11 completes the matching backend contract. Implement
each item as an independent release, not one combined redesign.

1. Capacity, workload, schedule-explanation and what-if UI.
2. Personal/shared Saved Views UI.
3. Project health status, history and update composer.
4. Flexible habits and weekly focus-target screens.
5. Mail Remind Me/Snooze and user-defined focused splits.
   **Status:** implementation complete (2026-08-15). Focused splits are
   private sender rules scoped only to `userId`; no workspace or sharing model
   exists. Standard E2E passed (24 passed, 3 credential-gated skips,
   2026-08-16); visual confirmation remains pending because the dev-matrix
   `/mail` navigation timed out, while the production build compiles it.

Do not add read receipts, team snippets, Notion-style automation, portfolio
management, audio transcription or new integrations in this track.

## T9 — Documentation and accessibility coverage

**Prerequisite:** update incrementally after each shipped task; finalize after T7.

- Mark old plans as implementation-complete but release-gated where accurate.
- Add collaboration build/smoke to `docs/STACK.md` and correct stale schema facts
  in `CLAUDE.md`.
- Add a route access matrix and threat models for workspace, offline, public
  links, AI mutations and provider credentials.
- Cover booking, callback, public Pages, workspace switch and logout cache purge
  in the release checklist.
- Add accessibility automation only after dependency approval: WCAG 2.2 AA,
  keyboard navigation, focus order, labels, contrast, reduced motion, 200% zoom
  and touch targets.

```bash
npm run check:branding
npm run check:ui-contracts
npm run test:style
npm run test:visual
```

## T10 — Terra final gate

**Prerequisite:** all authorized Terra tasks complete. Sol S12 performs the final
security/adversarial review after this gate.

```bash
npm run type-check
npm run lint
npm run test:unit
npm run test:e2e
npm run check:branding
npm run check:ui-contracts
npm run test:style
npm run test:visual
npm run build
npm run build:worker
npm run build:collaboration
docker build -f docker/production/Dockerfile .
```
