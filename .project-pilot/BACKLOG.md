# Backlog

## Ready to triage

| Idea | User value | Urgency | Dependencies | Size | Evidence |
| --- | --- | --- | --- | --- | --- |
| First-run wizard + seed content | Makes an empty product immediately useful | High after product completion | Stable golden loop | M | New account reaches a populated Today view |
| Task-sync status indicators | Makes provider state understandable | Medium | Stable task sync | M | Last-sync and error states visible |
| Bidirectional sync conflicts | Prevents silent overwrites | Medium | Provider test accounts | L | Conflict scenarios covered |
| Landing + domain split | Enables public launch | Medium | Stable personal beta | M | `needt.app` converts to `use.needt.app` |
| Billing activation | Supports monetization | Medium | Public launch decision | M | Sandbox purchase and webhook lifecycle pass |
| PWA performance pass | Improves native feel | High before beta | Finished core screens | M | 375px installed-PWA smoke has no jank/overflow |
| Companion behavior expansion | Adds delight and guidance | Low | Stable release/perf budget | M | No navigation or accessibility regression |

## Parked

- Native App Store wrapper — reconsider after PWA usage proves demand.
- Telegram/n8n clients — reconsider after `/api/connect/*` is production-proven.
- Team collaboration and multi-tenant SaaS — reconsider only after the personal
  workflow is stable and the product direction changes explicitly.
- More experimental visual concepts — reconsider after the core GUI is coherent.
