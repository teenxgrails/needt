# Needt

## Mission

Needt is a single-user intelligent planner that turns tasks, calendar constraints,
and personal energy into a realistic day. Deterministic scheduling is the trusted
default; AI may parse, explain, and propose changes but must never be required for
the core planning loop.

## Success measures

- One person can capture a task, auto-schedule it, execute it in Today/Focus, and
  recover from a changed day without losing data or manually rebuilding the plan.
- Google, Outlook, and Apple/iCloud calendar connections fail clearly and keep the
  Needt schedule consistent when configured.
- The installed mobile PWA supports the same core loop without layout breaks or
  navigation jank.
- A release candidate passes the defined production smoke and engineering gates.

## Principles

- Prefer explicit, testable behavior over hidden magic.
- Keep one canonical Task model across Calendar, Today, Focus, Boards, Mail, and AI.
- Ask for consent before AI or rescheduling makes consequential changes.
- Keep scope proportional to the current milestone; finish the core loop before
  adding another surface.

## Constraints

- Next.js 15, TypeScript, Prisma/PostgreSQL, NextAuth, FullCalendar, and pnpm.
- Single-user first; existing user seams may remain but team behavior is not part
  of the current milestone.
- Production calendar and AI verification require user-owned provider credentials.
- Production is Coolify on a VPS: one web service and one BullMQ worker using the
  same Dockerfile and SHA, with Coolify-managed PostgreSQL and Redis.
- Shared UI must follow `design-refs/ui-conventions.md`: token-based, no glow or
  backdrop blur, and reuse the established controls.

## Non-goals

- Team collaboration, seats, roles, and public multi-tenant signup.
- A native mobile app before the PWA release is proven.
- Telegram/n8n-specific clients before the connector API is proven in production.
- Additional novelty UI or new top-level features during release stabilization.
- A custom in-house AI model; only the provider seam belongs in this release.
