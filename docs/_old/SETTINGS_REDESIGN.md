# SETTINGS_REDESIGN.md

Goal: restructure and reskin **Settings** so it's clean, non-redundant, and
Motion-like. Right now there are 14 tabs, duplicated controls (Working Hours
lives in both Calendars and Auto-scheduling; Energy lives in two places), and an
inconsistent look. Consolidate the information architecture, remove duplicates,
and rebuild every page in our house style.

This is an **IA + UI reorganization only** — reuse the existing settings store
(`src/store/settings.ts`) and API. Do NOT add DB columns or duplicate state.
Follow `CLAUDE.md` and `design-refs/ui-conventions.md` (token colors, no glow,
no backdrop blur, reuse `@/components/ui/*`).

Entry point: `src/app/(common)/settings/page.tsx` (the `tabs` array + the
`renderTabContent` switch). Components live in `src/components/settings/*`.

---

## 1. Target structure (was 14 → now 8 + account)

Merge/rename as follows. Each setting must have **exactly one home**.

**General**

1. **Calendars** — connected accounts (Apple/Google/CalDAV), calendar list &
   visibility, default calendar for new events.
   Sources: `CalendarSettings.tsx`, `AvailableCalendars.tsx`,
   `CalDAVAccountForm.tsx`, calendar parts of `ConnectorSettings.tsx`.
   **Remove Working Hours and Week Start Day from here** (they move — see below).
2. **Scheduling** (rename of Auto-scheduling) — the single home for:
   Working hours + Working days, **Energy level time preferences** (fold the
   whole "Energy profile" tab in here), Buffer time, Project grouping, Calendars
   to consider.
   Sources: `AutoScheduleSettings.tsx` + `SmartSchedulingSettings.tsx` (merge).
   **Delete the standalone "Energy profile" tab.**
3. **Tasks** — one page, two sections: "Task defaults" and "Task urgency".
   Sources: `TaskSyncSettings.tsx` (defaults) + `TaskUrgencySettings.tsx` (merge).
4. **Appearance** — one page merging Theme + Customization: theme, accent color,
   density, corner radius, event chips, animations, **plus Week Start Day and the
   "Show working hours" display toggle** (display-only prefs live here).
   Sources: `UserSettings.tsx` (Theme) + `CustomizationSettings.tsx` (merge).
5. **Notifications** — `NotificationSettings.tsx` (keep). Match Motion's grid:
   Event rows × columns (Inbox / Email / Browser-Desktop / Mobile) with checkboxes.
6. **AI** — providers, API keys, soul presets, allowed actions.
   Source: `AIAssistantSettings.tsx`.
7. **Integrations** — non-calendar integrations/connectors only (calendar
   accounts now live in Calendars). Sources: `IntegrationSettings.tsx` +
   non-calendar parts of `ConnectorSettings.tsx`.
8. **Import / Export** — `ImportExportSettings.tsx` + `DataSettings.tsx`.

**Account** (admin-gated where already gated)

- **Account** · **System** · **Logs** (keep as-is, just restyle).

Update the `SettingsTab` union, the `tabs` array (with the `General` / `Account`
group labels), the hash routing list, and `renderTabContent` accordingly.

## 2. Redundancy rules (must hold after the refactor)

- Working hours / working days: **Scheduling only.** Remove from Calendars.
- Energy preferences: **Scheduling only.** Delete the separate Energy tab.
- Week start day + "show working hours" (display): **Appearance only.**
- Theme + accent + density + radius + chips + animations: **Appearance only.**
- No setting appears on two pages. If two controls wrote the same store field,
  keep one and delete the other (they already share `settings.ts`).

## 3. House style (match Motion — screenshots 3–6 are the reference)

Reuse existing primitives; do not invent new control styles.

- **Row layout:** left column = label (white, ~14px/500) + one-line description
  (`#9BA1A6`); right column = the control. Rows separated by 1px `#2B2F31`
  dividers. Comfortable vertical padding (~20–24px).
- **Page header:** bold title + a single grey description line under it.
- **Section grouping:** a bold section title (e.g. "Calendar Settings") with its
  rows beneath, like Motion.
- **Controls (pick ONE per concept and use it everywhere):**
  - Selects/dropdowns → `@/components/ui/select`.
  - On/off → `@/components/ui/switch` (Switch). Use switches consistently — do
    **not** mix checkboxes and toggles for the same kind of choice (today the
    working-days control is checkboxes in one tab and toggles in another — unify).
  - Multi-pick grids (e.g. Notifications matrix) → checkboxes.
  - Sliders (Buffer time) → `@/components/ui/slider` with a live value label.
- **Left settings nav:** grouped headers `General` / `Account` in grey uppercase,
  icon + label rows, active row highlighted (accent text / raised bg), matches
  the current sidebar look but tightened.
- Tokens: page bg `#1B1D1E`, raised surfaces `#202425`/`#262627`, lines
  `#2B2F31`, text `#F2F2F2` / muted `#9BA1A6`, accent `#6366F1`. Fast, subtle
  animations (~120–180ms ease-out); no blur, no glow.

## 4. Acceptance criteria

- Settings has 8 General pages + Account/System/Logs; no duplicated controls.
- Working hours, working days, and energy prefs appear only under **Scheduling**;
  week start + display toggles only under **Appearance**.
- Every page uses the same row layout, dividers, and control components; visually
  consistent with Motion's settings.
- Deep links / hash routes updated; no dead tabs; old tab hashes redirect or map
  to the new home.
- `pnpm tsc --noEmit` clean · `pnpm test:unit` green · `pnpm build` succeeds.
- `CHANGELOG.md` updated under `[Unreleased]`. Commit per page/step.

Do not mark done until the structure matches section 1 and no control is
duplicated (section 2).
