# Design

## Pages contract

`Page` owns hierarchy and privacy. `PageBlock` stores ordered content with HUMAN/AI provenance. Databases reuse record pages and typed values; views store presentation configuration over the same records. `PageRevision` preserves recovery snapshots. AI queries exclude any private page or descendant on the server, and AI writes create `AiPageChangeProposal` previews only.

Legacy Board tables and task fields remain in the schema but their routes redirect to Pages and their product/AI navigation is removed.

Page saves reconcile stable block IDs instead of replacing the whole document. Every accepted write creates a revision snapshot. The editor supports structured text, lists, checklists, quotes, callouts, toggles, code, dividers, links, bookmarks, private assets, tables, columns and page/date mentions. Comments, templates and forms remain authenticated and private. Database Table, Board, List, Calendar, Timeline and Gallery views are projections over the same records and typed properties.

## Today contract

Desktop uses `minmax(620px, 1fr) / clamp(260px, 22vw, 340px)`. Tablet and phone keep the document primary and expose the synchronized day timeline through a bottom sheet. Daily content keeps local drafts, debounced versioned saves and visible save state. Rollover is an explicit evening review, never a silent deadline mutation.

Today consumes the same block-document editing contract as Pages and adds task and task-group nodes. Document and timeline scroll independently on desktop. Timeline drag and resize use the existing calendar-drag mutation contract and pin manually placed tasks.

## Settings and integrations

Normal appearance controls optimistically autosave with debounce and rollback. Secrets and OAuth remain explicit. The catalog uses one adapter contract; native calendars retain their existing flows, while Composio is inert when unconfigured and write actions require confirmation.

Bug reports persist first. A Redis-backed retry job creates a sanitized GitHub Issue when configured; attachments stay private in Needt.

Desktop settings navigation mirrors the mobile groups: Planner, Preferences, Connections and Account. `Report a bug` is a fixed footer action outside the scrolling navigation. Compact rows use the shared Select, Switch, date/time picker and Dialog contracts.

Theme mode has four stored values: Light, Gray, Dark and System. Gray preserves the existing Motion-like graphite palette. Dark uses `#0E0E10` as its canvas. Existing stored `dark` values and System dark resolve to the new Dark palette. The legacy `backgroundTint` field remains readable and writable for compatibility but no longer overrides global theme tokens.

Native and adapter integrations use open-source provider icons or provider-approved public icon URLs and retain text labels for accessibility.

## Schedules and flexible hours

`WorkSchedule` is a named, timezone-aware collection of zero or more 15-minute windows for each weekday. The first migration materializes the existing preference work hours as the user's default `Work Hours` schedule. Tasks and recurring-task definitions may select a schedule; absent assignments resolve to the user's default. The deterministic scheduler receives the resolved schedule windows and otherwise preserves its current priority, deadline, dependency, energy, chunking, busy-time and fallback behavior.

`FlexibleHoursOverride` represents a single local date adjustment: start later, stop early, block a range, block the whole day, or reset. Overrides intersect with the selected regular schedule before slot search. They are availability state, not Tasks or Events. Calendar renders their excluded time as a diagonal texture. Legacy `[NEEDT_DAY_BLOCK]` events are retained, migrated additively into overrides and hidden from ordinary Event UI.

The schedule editor supports create, rename, delete, default selection, multiple daily windows, precise time fields, and 15-minute drag/resize. Copy explicitly selects target weekdays and copies all source windows only to them. Pointer interaction inside an existing window moves or resizes it and never creates another window.

## Calendar and editors

The current-day header treatment spans weekday and date. Day actions appear on hover or keyboard focus. Calendar toolbar `+` opens the shared Task/Event editor in Task mode. Event mode uses the same shell, rich-text editor, picker controls, responsive grid and footer as Task mode.

## Deployment

GitHub Actions runs gates before a multi-architecture GHCR push. The immutable SHA identifies both web and worker. Optional Coolify hooks run migration, worker and web sequentially, then health-check and invoke rollback on failure.
