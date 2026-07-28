# Needt stack and release contract

Needt is a multi-user Next.js 15 application with a separate BullMQ worker
built from the same commit and production image.

## Runtime

- Node.js 22, npm only (`package-lock.json` is authoritative).
- Next.js App Router, React 19, TypeScript.
- PostgreSQL 16 through Prisma.
- Redis 7 for BullMQ, rate limits, lockouts, alert throttling, and realtime
  coordination.
- NextAuth credentials, Google, and Microsoft OAuth.
- Sentry in the Next.js client/server/edge runtimes and the worker.
- Web Push through VAPID with email fallback through Resend.

Install locally with `npm install --legacy-peer-deps`. Docker and CI run
`npm ci`; `.npmrc` carries the peer-dependency compatibility setting.

## Required quality gates

`next build` intentionally does not run TypeScript or ESLint validation. Every
change must independently pass:

1. `npm run type-check`
2. `npm run lint`
3. `npm run test:unit`
4. `npm run test:e2e`
5. visual/style suites when UI, CSS, tokens, or shared components change
6. `npm run build`
7. `npm run build:worker`
8. the production Docker build

GitHub Actions exposes required `quality-gates`, `schema-drift`, `e2e`, and
conditionally executed `visual-style` statuses. Production publishing is
triggered only by a successful CI run on `main`.

`npm run check:branding` is part of CI. Product copy and internal event names
use Needt only; legal attribution and `@fullcalendar/*` package IDs are the
explicit exceptions.

## Shared UI contracts

`src/components/ui/needt-picker.tsx` is the only product picker. It covers
plain, searchable, and creatable single-select flows and switches from an
anchored desktop popover to a mobile bottom sheet. Theme IDs are `light`,
`graphite`, `dark`, and `system`; persisted `gray` is normalized to `graphite`
when read.

Calendar positioning is centralized in
`src/lib/calendar-scroll-policy.ts`; period arithmetic and interaction guards
live in `src/lib/calendar-navigation.ts`. Data refreshes must not invoke the
scroll policy or reset a user's manual vertical position.

The Today desktop route locks to the app viewport. `TodayView` owns independent
document and timeline scrollers, while `DayTimeline` positions today at the
current-time marker and other dates at their first event or Work Schedule
start. Mobile keeps normal document page scroll and moves the timeline into a
bottom sheet.

Focus is rendered as a single flat, state-stable canvas in
`src/components/focus/FocusTimerPanel.tsx`. The server remains authoritative
for session phase and elapsed time; the client keeps timer feedback, duration
scrubbing, and the throttled live countdown in one consistent geometry.

The AI companion stores normalized coordinates through
`src/lib/assistant-position.ts`, so resize and orientation changes preserve the
relative position while reapplying sidebar, mobile-dock, and safe-area bounds.
All product notifications call `src/lib/notifications.ts`; direct Sonner calls
are restricted to that facade and the shared Toaster implementation.

## Multi-user isolation

Scheduling runs, idempotency records, focus data, dependencies, reminders,
push subscriptions, nudges, booking pages, and bookings are keyed by `userId`
or owner ID. All authenticated APIs validate ownership server-side.
FREE/PRO/LIFETIME restrictions are server-enforced in `src/lib/entitlements.ts`;
hidden UI is never the security boundary.

## Deployment order

Web and worker use expand/contract deployment:

1. take/verify a database backup;
2. deploy additive migrations;
3. deploy worker and web from the same SHA;
4. run the release gate and inspect `/admin/operations`;
5. enable feature flags only after the smoke test;
6. contract/remove old fields only after at least one fallback release.
