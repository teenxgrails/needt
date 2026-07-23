# Design

## Pages contract

`Page` owns hierarchy and privacy. `PageBlock` stores ordered content with HUMAN/AI provenance. Databases reuse record pages and typed values; views store presentation configuration over the same records. `PageRevision` preserves recovery snapshots. AI queries exclude any private page or descendant on the server, and AI writes create `AiPageChangeProposal` previews only.

Legacy Board tables and task fields remain in the schema but their routes redirect to Pages and their product/AI navigation is removed.

## Today contract

Desktop uses `minmax(620px, 1fr) / clamp(260px, 22vw, 340px)`. Tablet and phone keep the document primary and expose the synchronized day timeline through a bottom sheet. Daily content keeps local drafts, debounced versioned saves and visible save state. Rollover is an explicit evening review, never a silent deadline mutation.

## Settings and integrations

Normal appearance controls optimistically autosave with debounce and rollback. Secrets and OAuth remain explicit. The catalog uses one adapter contract; native calendars retain their existing flows, while Composio is inert when unconfigured and write actions require confirmation.

Bug reports persist first. A Redis-backed retry job creates a sanitized GitHub Issue when configured; attachments stay private in Needt.

## Deployment

GitHub Actions runs gates before a multi-architecture GHCR push. The immutable SHA identifies both web and worker. Optional Coolify hooks run migration, worker and web sequentially, then health-check and invoke rollback on failure.
