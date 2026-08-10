# 06 — Product gap audit

**Audit date:** 2026-08-08. Plans 01–05 and the Today daily-planner change are
implemented. This file is a backlog, not authorization to add schema or scope.

## Highest-value product gaps

1. **Capacity and schedule explanations (P1).** Add privacy-safe team workload,
   a clear “why this time?” explanation, and a reversible what-if preview.
   Motion treats capacity as a core planning surface ([capacity planning](https://www.usemotion.com/help/project-management/capacity-planning)).
2. **Saved personal/shared views (P1).** Persist named filters, grouping, sort,
   columns, and workspace sharing without reviving the obsolete user-only schema
   in `docs/tasklist-enhancements.md`. Todoist exposes saved custom views as a
   first-class workflow ([custom views](https://www.todoist.com/help/articles/customize-views-in-todoist-AoHhBxFdZ)).
3. **Flexible habits and weekly focus targets (P2).** Reuse the deterministic
   scheduler for recurring flexible commitments, with skip and recovery rules.
   Reclaim documents habits and focus time as separate schedulable primitives
   ([features](https://help.reclaim.ai/en/articles/6210740-features-in-reclaim)).
4. **Project health and updates (P2).** Derive risk, blocked work, schedule drift,
   and concise weekly updates from existing project/task activity. Linear's
   updates and insights are useful reference behavior ([updates](https://linear.app/docs/initiative-and-project-updates), [insights](https://linear.app/docs/insights)).
5. **Meeting-note action review (P3).** Convert notes into proposed tasks only
   after explicit review; never let AI silently mutate the schedule. Motion's
   notetaker shows the value of connecting notes to work
   ([AI Notetaker](https://www.usemotion.com/help/knowledge-management/ai-notetaker)).

## Known technical debt

- CalDAV recurrence expansion and single-instance editing remain deferred:
  `src/lib/caldav-calendar.ts`, `src/app/api/calendar/caldav/events/route.ts`,
  and `src/components/calendar/EventModal.tsx`.
- Scheduler buffer handling still needs consolidation:
  `src/services/scheduling/TimeSlotManager.ts`.
- Outlook event creation still waits on the provider before local persistence:
  `src/app/api/calendar/outlook/events/route.ts`.
- Dependency audit is free of critical findings. Remaining high/moderate items
  require isolated major upgrades (Next, MSAL, Google APIs) or come from the
  Excalidraw/Mermaid chain; do not use `npm audit fix --force`.
