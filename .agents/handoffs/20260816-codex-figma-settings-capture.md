---
id: 20260816-codex-figma-settings-capture
owner: codex
branch: codex/design-completion
status: complete
updated: 2026-08-16T02:39:44Z
objective: Capture every Settings panel and reachable non-destructive dialog in the owner-provided Figma file.
---

## Scope

- Governing plan/spec: Owner-directed Figma capture request.
- In scope: Capturing Settings panels and their reachable non-destructive dialogs.
- Out of scope: Product UI, visual redesign, committed application behavior, and non-Settings dialogs.

## Completed

- Captured the requested eight primary application screens in Figma.
- Captured every Settings panel: Calendars (`66:2`), Auto-scheduling (`67:2`), Task defaults (`69:2`), Appearance (`70:2`), Timezone (`71:2`), Notifications (`72:2`), Schedules (`73:2`), Booking links (`74:2`), Desktop app (`75:2`), Integrations (`76:2`), API (`78:2`), Privacy (`80:2`), AI Assistant (`81:2`), Account settings (`82:2`), Workspace (`83:2`), Billing (`85:2`).
- Captured reachable safe overlays: Add account menu (`86:2`), empty iCloud/CalDAV dialog (`87:2`), both Calendar Grouping editors (`88:2`, `89:2`), existing and new Schedule editors (`90:2`, `92:2`), Report a bug (`91:2`), and the global Needt assistant popover (`93:2`).

## Working state

- Files currently dirty or expected to change: this handoff only; no application-source changes are required.
- Foreign changes that must remain untouched: Existing Mail T8.5, E2E, Figma layout/config, and planning-file changes shown by `npm run agent:context`.

## Verification

- Passed: `npm run build`; production `npm run start` with E2E fixture environment; Chrome renders populated Settings panels after a fixed 1.5-second wait. Figma script loads with HTTP 200 in the local page. Manual `window.figma.captureForDesign({ selector: "body" })` captured each full screen after about 60 seconds. Calendars was visually verified from Figma screenshot; each other capture was confirmed by the Figma completion response.
- Not run: broad project quality gates; no product source was changed.

## Decisions and constraints

- Do not depend on Figma's automatic hash trigger or toolbar: although the script loads, automatic submit does not fire and the toolbar is absent. Use the script's exposed `window.figma.captureForDesign` method after the fixed render wait; it is the functional equivalent of `Entire screen` and sends `selector: "body"`.
- Keep `.codex/config.toml` and `src/app/layout.tsx` unchanged.

## Blockers

- `npm run dev` produces a black screen in Chrome because its client chunks containing `@neondatabase/serverless` fail to parse. The production server was used for capture only.

## Next action

- Capture objective complete. Leave Figma capture script and owner-designated configuration unchanged. Resume the owner-locked E2E/T8.5 delivery order from `NEXT_AGENT.md` in a separate workstream.
