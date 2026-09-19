"use client";

/* SETTINGS — nine sections with search, opened in place.
 *
 * Ported from `SettingsScreen.jsx`. That screen owns the whole window
 * (`screens.ts`: "the rail would only offer ways to leave it"), and
 * `AppShell` already gives it that: `settings ? null : <TabRail/>`, and its
 * own `ScreenFrame` already draws the "Settings" title, the blurb and the
 * Back action (`AppShell.tsx`, the `settings ? <button>Back</button> : null`
 * branch). So this file does not draw a second title or a second Back
 * button — it owns what is left: the search field, the section rail, and one
 * section's rows at a time.
 *
 * PORT.md §0 rule 4 — "one form-label column ... a label that does not fit
 * gets shortened, never the column widened" — is the whole content area:
 * every row below is `Row` from `./fields`, which is the one place that
 * writes `.nt-row`.
 *
 * The section rail is `nav[aria-label="Settings sections"]` on purpose: the
 * vendored motion sheet's focus rule is keyed to that exact selector
 * (`needt-motion.css`), and the roving keyboard nav below (arrows, Home/End)
 * is what the kit's own `navKeys` did.
 */
import * as React from "react";

import type { IconType } from "react-icons";
import {
  LuBell,
  LuCalendarDays,
  LuCalendarOff,
  LuCheck,
  LuClock,
  LuCommand,
  LuDatabase,
  LuDownload,
  LuEllipsis,
  LuFlame,
  LuListChecks,
  LuLogOut,
  LuPalette,
  LuPlus,
  LuRefreshCw,
  LuSearch,
  LuTarget,
  LuTrash2,
  LuUnlink,
  LuUser,
} from "react-icons/lu";

import {
  Avatar,
  Chip,
  Glyph,
  Hung,
  IconButton,
  MenuItem,
  MenuSeparator,
} from "../shell/chrome";
import { NEEDT_KEYS } from "../shell/keys";
import { AppearanceSection, type AppearanceValue } from "./AppearanceSection";
import {
  Group,
  RadioRow,
  Row,
  SInput,
  SSelect,
  SSwitch,
  STooltip,
} from "./fields";
import {
  SETTINGS_SECTIONS,
  type SettingsSectionId,
  filterSettingsSections,
  settingsSection,
} from "./sections";

const SECTION_GLYPHS: Readonly<Record<SettingsSectionId, IconType>> = {
  appearance: LuPalette,
  day: LuClock,
  calendars: LuCalendarDays,
  tasks: LuListChecks,
  focus: LuTarget,
  alerts: LuBell,
  keys: LuCommand,
  account: LuUser,
  data: LuDatabase,
};

interface ConnectedCalendar {
  id: "apple" | "google";
  name: string;
  mail: string;
  colour: string;
  sync: boolean;
}

const DEFAULT_CALENDARS: readonly ConnectedCalendar[] = [
  {
    id: "apple",
    name: "Apple Calendar",
    mail: "you@icloud.com",
    colour: "var(--success)",
    sync: true,
  },
  {
    id: "google",
    name: "Google Calendar",
    mail: "you@needt.app",
    colour: "var(--info)",
    sync: true,
  },
];

function CalendarRow({
  account,
  onSync,
  onDisconnect,
}: {
  account: ConnectedCalendar;
  onSync: (sync: boolean) => void;
  onDisconnect: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        height: 44,
        padding: "0 11px",
        borderRadius: "var(--radius-xl)",
        background: "var(--fill-2)",
      }}
    >
      <span
        className="raised"
        style={{
          width: 26,
          height: 26,
          display: "grid",
          placeItems: "center",
          borderRadius: "var(--radius-md)",
        }}
      >
        <Glyph of={LuCalendarDays} size={14} />
      </span>
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span
          style={{
            font: "var(--type-ui-medium)",
            color: "var(--text-primary)",
          }}
        >
          {account.name}
        </span>
        <span
          style={{
            font: "var(--type-meta)",
            color: "var(--text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {account.mail}
        </span>
      </span>
      <span
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 11,
        }}
      >
        <STooltip label="This calendar's colour fills its events">
          <span
            aria-hidden="true"
            style={{
              width: 12,
              height: 12,
              borderRadius: 4,
              background: account.colour,
            }}
          />
        </STooltip>
        <SSwitch checked={account.sync} onChange={onSync} />
        <Hung
          open={open}
          kind="menu"
          onDismiss={() => setOpen(false)}
          trigger={
            <IconButton
              label="More"
              variant="ghost"
              icon={<Glyph of={LuEllipsis} size={14} />}
              onClick={() => setOpen((v) => !v)}
            />
          }
        >
          <MenuItem icon={<Glyph of={LuRefreshCw} size={14} />}>
            Sync now
          </MenuItem>
          <MenuItem icon={<Glyph of={LuPalette} size={14} />}>
            Change colour
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            destructive
            icon={<Glyph of={LuUnlink} size={14} />}
            onClick={() => {
              setOpen(false);
              onDisconnect();
            }}
          >
            Disconnect
          </MenuItem>
        </Hung>
      </span>
    </div>
  );
}

const CONTROL_W = 220;

export interface SettingsScreenProps {
  /** The person's own name/email/initials, for the Account section. Defaults
   *  are the fixture's own placeholder — this screen has no store. */
  accountName?: string;
  accountEmail?: string;
  accountInitials?: string;
  onSignOut?: () => void;
}

export function SettingsScreen({
  accountName = "You",
  accountEmail = "you@needt.app",
  accountInitials = "YO",
  onSignOut,
}: SettingsScreenProps) {
  const [section, setSection] = React.useState<SettingsSectionId>("appearance");
  const [query, setQuery] = React.useState("");
  const [saved, setSaved] = React.useState(0);
  const navRef = React.useRef<HTMLElement | null>(null);

  const hits = React.useMemo(() => filterSettingsSections(query), [query]);
  /* The search narrows the NAV LIST only. The panel keeps showing whatever
     section was last explicitly chosen — resolved against the full
     registry, not `hits` — so typing in the search field can never switch
     the content out from under the person reading it. */
  const active = settingsSection(section);

  /* Nothing here is saved with a button — a change writes itself and says so
     once, then the mark leaves. The receipt is the animation, not a banner. */
  const mark = React.useCallback(<T,>(setter: (value: T) => void) => {
    return (value: T) => {
      setter(value);
      setSaved(Date.now());
    };
  }, []);
  React.useEffect(() => {
    if (!saved) return undefined;
    const id = window.setTimeout(() => setSaved(0), 1700);
    return () => window.clearTimeout(id);
  }, [saved]);

  function open(id: SettingsSectionId) {
    if (id !== section) setSection(id);
  }

  /* One tab stop with a roving selection: arrows move, Home/End jump to the
     ends. PORT.md §5: one table, one behaviour — this is that rule's
     counterpart for a list rather than a keyboard chord. */
  function navKeys(event: React.KeyboardEvent<HTMLElement>) {
    const list = hits.length ? hits : SETTINGS_SECTIONS;
    const at = list.findIndex((s) => s.id === active.id);
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      open(list[Math.min(at + 1, list.length - 1)].id);
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      open(list[Math.max(at - 1, 0)].id);
    }
    if (event.key === "Home") {
      event.preventDefault();
      open(list[0].id);
    }
    if (event.key === "End") {
      event.preventDefault();
      open(list[list.length - 1].id);
    }
  }

  /* ── Appearance ─────────────────────────────────────────────────────── */
  const [appearance, setAppearance] = React.useState<AppearanceValue>({
    theme: "paper",
    pair: { light: "paper", dark: "dark" },
    drift: false,
    rail: "movability",
    density: "standard",
  });
  const [font, setFont] = React.useState("inter");
  const [docWidth, setDocWidth] = React.useState("844");

  /* ── Your day ───────────────────────────────────────────────────────── */
  const [dayStart, setDayStart] = React.useState("09:00");
  const [dayEnd, setDayEnd] = React.useState("18:00");
  const [weekStart, setWeekStart] = React.useState("mon");
  const [zone, setZone] = React.useState("cet");
  const [auto, setAuto] = React.useState(true);
  const [protect, setProtect] = React.useState(true);
  const [minChunk, setMinChunk] = React.useState("30");
  const [buffer, setBuffer] = React.useState("10");
  const [fillWeekends, setFillWeekends] = React.useState(false);

  /* ── Calendars ──────────────────────────────────────────────────────── */
  const [calendars, setCalendars] = React.useState(DEFAULT_CALENDARS);
  const [declined, setDeclined] = React.useState(false);
  const [allDay, setAllDay] = React.useState(true);
  const [writeBack, setWriteBack] = React.useState(true);
  const [defaultView, setDefaultView] = React.useState("week");

  /* ── Tasks ──────────────────────────────────────────────────────────── */
  const [estimate, setEstimate] = React.useState("45");
  const [defaultProject, setDefaultProject] = React.useState("none");
  const [showParts, setShowParts] = React.useState(true);
  const [moneyGroups, setMoneyGroups] = React.useState(true);

  /* ── Focus ──────────────────────────────────────────────────────────── */
  const [sessionLength, setSessionLength] = React.useState("50");
  const [sessionBreak, setSessionBreak] = React.useState("10");
  const [startSound, setStartSound] = React.useState("none");
  const [cornerGlow, setCornerGlow] = React.useState(true);
  const [hideAlerts, setHideAlerts] = React.useState(true);
  const [snapClick, setSnapClick] = React.useState(false);
  const [stopMark, setStopMark] = React.useState(true);

  /* ── Alerts ─────────────────────────────────────────────────────────── */
  const [dailyPlan, setDailyPlan] = React.useState(true);
  const [dailyPlanAt, setDailyPlanAt] = React.useState("08:30");
  const [overdueAlert, setOverdueAlert] = React.useState(false);
  const [weekReview, setWeekReview] = React.useState(true);
  const [channel, setChannel] = React.useState("desktop");

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          flex: "none",
          display: "flex",
          justifyContent: "flex-end",
          gap: 11,
          paddingBottom: 11,
        }}
      >
        {saved ? (
          <span
            key={saved}
            className="saved-pop"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              height: 24,
              padding: "0 8px",
              borderRadius: "var(--radius-lg)",
              background: "var(--fill-accent)",
              color: "var(--accent)",
              font: "var(--type-meta-medium)",
            }}
          >
            <Glyph of={LuCheck} size={13} />
            Saved
          </span>
        ) : null}
        <span
          style={{ position: "relative", display: "inline-flex", width: 210 }}
        >
          <input
            className="nt-input"
            placeholder="Find a setting"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{ paddingLeft: 28 }}
          />
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-quaternary)",
            }}
          >
            <Glyph of={LuSearch} size={14} />
          </span>
        </span>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          gap: 20,
          paddingBottom: 20,
        }}
      >
        <nav
          ref={navRef}
          tabIndex={0}
          aria-label="Settings sections"
          onKeyDown={navKeys}
          style={{
            flex: "none",
            width: 176,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {hits.length === 0 ? (
            <p
              style={{
                margin: "8px 6px",
                font: "var(--type-meta)",
                fontStyle: "italic",
                color: "var(--text-muted)",
                textWrap: "pretty",
              }}
            >
              Nothing matches &quot;{query}&quot;. Try a word from the setting
              itself, like &quot;rail&quot; or &quot;buffer&quot;.
            </p>
          ) : null}
          {hits.map((s) => (
            <button
              key={s.id}
              type="button"
              className="nav-row nt-nav-row"
              aria-current={active.id === s.id ? "page" : undefined}
              data-active={active.id === s.id ? "true" : undefined}
              onClick={() => open(s.id)}
            >
              <Glyph of={SECTION_GLYPHS[s.id]} size={16} />
              <span
                style={{
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {s.label}
              </span>
            </button>
          ))}
        </nav>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            id="settings-panel"
            key={active.id}
            className="settings-enter scroll-inner"
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              padding: "0 4px 0 0",
            }}
          >
            <h2
              style={{
                margin: "0 0 16px",
                font: "var(--type-card-title)",
                color: "var(--text-primary)",
              }}
            >
              {active.label}
            </h2>

            {active.id === "appearance" ? (
              <AppearanceSection
                value={appearance}
                onChange={(patch) => {
                  setAppearance((current) => ({ ...current, ...patch }));
                  setSaved(Date.now());
                }}
              />
            ) : null}

            {active.id === "appearance" ? (
              <Group title="Type">
                <Row label="Interface font">
                  <SSelect
                    value={font}
                    onChange={mark(setFont)}
                    width={CONTROL_W}
                    options={[
                      { value: "inter", label: "Inter" },
                      { value: "system", label: "System" },
                    ]}
                  />
                </Row>
                <Row label="Document width">
                  <SInput
                    value={docWidth}
                    onChange={mark(setDocWidth)}
                    suffix="px"
                    width={120}
                  />
                </Row>
              </Group>
            ) : null}

            {active.id === "day" ? (
              <>
                <Group title="Working hours">
                  <Row label="Day starts">
                    <SInput
                      type="time"
                      value={dayStart}
                      onChange={mark(setDayStart)}
                      width={120}
                    />
                  </Row>
                  <Row label="Day ends">
                    <SInput
                      type="time"
                      value={dayEnd}
                      onChange={mark(setDayEnd)}
                      width={120}
                    />
                  </Row>
                  <Row label="Week starts">
                    <SSelect
                      value={weekStart}
                      onChange={mark(setWeekStart)}
                      width={CONTROL_W}
                      options={[
                        { value: "mon", label: "Monday" },
                        { value: "sun", label: "Sunday" },
                      ]}
                    />
                  </Row>
                  <Row label="Time zone">
                    <SSelect
                      value={zone}
                      onChange={mark(setZone)}
                      width={CONTROL_W}
                      options={[
                        { value: "cet", label: "CET — Berlin" },
                        { value: "utc", label: "UTC" },
                        { value: "est", label: "EST — New York" },
                      ]}
                    />
                  </Row>
                </Group>
                <Group title="Scheduler">
                  <Row
                    label="Auto-schedule"
                    hint="Unplaced tasks are placed into real free hours."
                  >
                    <SSwitch checked={auto} onChange={mark(setAuto)} />
                  </Row>
                  <Row
                    label="Protect focus"
                    hint="The scheduler will not place anything inside a focus block."
                  >
                    <SSwitch checked={protect} onChange={mark(setProtect)} />
                  </Row>
                  <Row label="Min chunk">
                    <SInput
                      value={minChunk}
                      onChange={mark(setMinChunk)}
                      suffix="min"
                      width={120}
                    />
                  </Row>
                  <Row label="Buffer">
                    <SInput
                      value={buffer}
                      onChange={mark(setBuffer)}
                      suffix="min"
                      width={120}
                    />
                  </Row>
                  <Row label="Fill weekends">
                    <SSwitch
                      checked={fillWeekends}
                      onChange={mark(setFillWeekends)}
                    />
                  </Row>
                </Group>
              </>
            ) : null}

            {active.id === "calendars" ? (
              <>
                <Group title="Connected">
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {calendars.length === 0 ? (
                      <div className="nt-empty">
                        <span className="nt-empty-icon">
                          <Glyph of={LuCalendarOff} size={24} />
                        </span>
                        <span className="nt-empty-text">
                          No calendar is connected. Events you already agreed to
                          will not appear on the grid until one is.
                        </span>
                        <button
                          type="button"
                          className="btn btn-flat"
                          onClick={() => {
                            setCalendars(DEFAULT_CALENDARS);
                            setSaved(Date.now());
                          }}
                        >
                          <Glyph of={LuPlus} size={13} />
                          Connect a calendar
                        </button>
                      </div>
                    ) : (
                      calendars.map((account) => (
                        <CalendarRow
                          key={account.id}
                          account={account}
                          onSync={mark((sync: boolean) =>
                            setCalendars((current) =>
                              current.map((c) =>
                                c.id === account.id ? { ...c, sync } : c
                              )
                            )
                          )}
                          onDisconnect={() => {
                            setCalendars((current) =>
                              current.filter((c) => c.id !== account.id)
                            );
                            setSaved(Date.now());
                          }}
                        />
                      ))
                    )}
                    {calendars.length ? (
                      <button
                        type="button"
                        className="btn btn-flat"
                        style={{ alignSelf: "flex-start" }}
                      >
                        <Glyph of={LuPlus} size={16} />
                        Connect a calendar
                      </button>
                    ) : null}
                  </div>
                </Group>
                <Group title="What lands on the grid">
                  <Row label="Declined">
                    <SSwitch checked={declined} onChange={mark(setDeclined)} />
                  </Row>
                  <Row label="All-day">
                    <SSwitch checked={allDay} onChange={mark(setAllDay)} />
                  </Row>
                  <Row
                    label="Write back"
                    hint="Closing an imported task closes it in its source."
                  >
                    <SSwitch
                      checked={writeBack}
                      onChange={mark(setWriteBack)}
                    />
                  </Row>
                  <Row label="Default view">
                    <SSelect
                      value={defaultView}
                      onChange={mark(setDefaultView)}
                      width={CONTROL_W}
                      options={[
                        { value: "week", label: "Week" },
                        { value: "month", label: "Month" },
                      ]}
                    />
                  </Row>
                </Group>
              </>
            ) : null}

            {active.id === "tasks" ? (
              <>
                <Group title="New tasks">
                  <Row label="Estimate">
                    <SInput
                      value={estimate}
                      onChange={mark(setEstimate)}
                      suffix="min"
                      width={120}
                    />
                  </Row>
                  <Row label="Project">
                    <SSelect
                      value={defaultProject}
                      onChange={mark(setDefaultProject)}
                      width={CONTROL_W}
                      options={[
                        { value: "none", label: "No project" },
                        { value: "ops", label: "Operations" },
                        { value: "ds", label: "Design system" },
                      ]}
                    />
                  </Row>
                  <Row
                    label="Show parts"
                    hint="Parts stay visible as nested rows instead of a disclosure."
                  >
                    <SSwitch
                      checked={showParts}
                      onChange={mark(setShowParts)}
                    />
                  </Row>
                  <Row
                    label="Money groups"
                    hint="A group of tasks states what it is worth when all of them close."
                  >
                    <SSwitch
                      checked={moneyGroups}
                      onChange={mark(setMoneyGroups)}
                    />
                  </Row>
                </Group>
                <Group title="Impulse">
                  <Row label="Flame">
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <Glyph of={LuFlame} size={16} />
                      <span
                        style={{
                          font: "var(--type-ui)",
                          color: "var(--text-tertiary)",
                          textWrap: "pretty",
                        }}
                      >
                        Height is parts and tasks closed lately. A cold category
                        has no flame, so there is nothing to switch off.
                      </span>
                    </span>
                  </Row>
                </Group>
              </>
            ) : null}

            {active.id === "focus" ? (
              <>
                <Group title="Session">
                  <Row label="Length">
                    <SInput
                      value={sessionLength}
                      onChange={mark(setSessionLength)}
                      suffix="min"
                      width={120}
                    />
                  </Row>
                  <Row label="Break">
                    <SInput
                      value={sessionBreak}
                      onChange={mark(setSessionBreak)}
                      suffix="min"
                      width={120}
                    />
                  </Row>
                  <Row label="Start sound">
                    <SSelect
                      value={startSound}
                      onChange={mark(setStartSound)}
                      width={CONTROL_W}
                      options={[
                        { value: "none", label: "Silent" },
                        { value: "tick", label: "Tick" },
                        { value: "chime", label: "Chime" },
                      ]}
                    />
                  </Row>
                </Group>
                <Group title="While a session runs">
                  <Row
                    label="Corner glow"
                    hint="The screen edges breathe in the accent for the length of the session."
                  >
                    <SSwitch
                      checked={cornerGlow}
                      onChange={mark(setCornerGlow)}
                    />
                  </Row>
                  <Row label="Hide alerts">
                    <SSwitch
                      checked={hideAlerts}
                      onChange={mark(setHideAlerts)}
                    />
                  </Row>
                  <Row
                    label="Snap click"
                    hint="A short click when a dragged task snaps to the quarter hour."
                  >
                    <SSwitch
                      checked={snapClick}
                      onChange={mark(setSnapClick)}
                    />
                  </Row>
                  <Row
                    label="Stop the mark"
                    hint="The wordmark holds still until the session ends."
                  >
                    <SSwitch checked={stopMark} onChange={mark(setStopMark)} />
                  </Row>
                </Group>
              </>
            ) : null}

            {active.id === "alerts" ? (
              <Group title="When Needt speaks">
                <Row label="Daily plan">
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <SSwitch
                      checked={dailyPlan}
                      onChange={mark(setDailyPlan)}
                    />
                    <SInput
                      type="time"
                      value={dailyPlanAt}
                      onChange={mark(setDailyPlanAt)}
                      width={108}
                    />
                  </span>
                </Row>
                <Row label="Overdue">
                  <SSwitch
                    checked={overdueAlert}
                    onChange={mark(setOverdueAlert)}
                  />
                </Row>
                <Row
                  label="Week review"
                  hint="Friday, once the last block closes."
                >
                  <SSwitch
                    checked={weekReview}
                    onChange={mark(setWeekReview)}
                  />
                </Row>
                <Row label="Channel">
                  <RadioRow
                    name="alert-channel"
                    value={channel}
                    onChange={mark(setChannel)}
                    items={[
                      { value: "desktop", label: "Desktop" },
                      { value: "mail", label: "Email" },
                      { value: "off", label: "None" },
                    ]}
                  />
                </Row>
              </Group>
            ) : null}

            {active.id === "keys" ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                {NEEDT_KEYS.map((group) => (
                  <div
                    key={group.title}
                    style={{ display: "flex", flexDirection: "column" }}
                  >
                    <span
                      style={{
                        font: "var(--type-meta-medium)",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: "var(--text-quaternary)",
                        height: 24,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {group.title}
                    </span>
                    {group.keys.map((row, i) => (
                      <div
                        key={row.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                          height: 34,
                          boxShadow: i
                            ? "var(--border) 0 -1px 0 0 inset"
                            : "none",
                        }}
                      >
                        <span
                          style={{
                            flex: "none",
                            width: 96,
                            display: "flex",
                            gap: 3,
                          }}
                        >
                          {row.caps.map((cap, j) => (
                            <kbd key={j} className="key-cap">
                              {cap}
                            </kbd>
                          ))}
                        </span>
                        <span
                          style={{
                            font: "var(--type-ui)",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          {row.label}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}

            {active.id === "account" ? (
              <>
                <Group title="You">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      paddingBottom: 16,
                    }}
                  >
                    <Avatar
                      initials={accountInitials}
                      name={accountName}
                      size={44}
                    />
                    <span style={{ display: "flex", flexDirection: "column" }}>
                      <span
                        style={{
                          font: "var(--type-card-title)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {accountName}
                      </span>
                      <span
                        style={{
                          font: "var(--type-meta)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {accountEmail}
                      </span>
                    </span>
                    <Chip accent>Pro</Chip>
                    <button
                      type="button"
                      className="btn btn-flat"
                      style={{ marginLeft: "auto" }}
                    >
                      Replace photo
                    </button>
                  </div>
                  <Row label="Password">
                    <button type="button" className="btn btn-flat">
                      Change password
                    </button>
                  </Row>
                </Group>
                <Group title="Session">
                  <Row label="Signed in">
                    <span
                      style={{
                        font: "var(--type-ui)",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      This device
                    </span>
                  </Row>
                  <Row label="Sign out">
                    <button
                      type="button"
                      className="btn btn-flat"
                      onClick={onSignOut}
                    >
                      <Glyph of={LuLogOut} size={14} />
                      Sign out
                    </button>
                  </Row>
                </Group>
              </>
            ) : null}

            {active.id === "data" ? (
              <>
                <Group title="Export">
                  <Row label="Tasks">
                    <button type="button" className="btn btn-flat">
                      <Glyph of={LuDownload} size={14} />
                      Download CSV
                    </button>
                  </Row>
                  <Row label="Documents">
                    <button type="button" className="btn btn-flat">
                      <Glyph of={LuDownload} size={14} />
                      Download Markdown
                    </button>
                  </Row>
                  <Row label="Everything">
                    <button type="button" className="btn btn-flat">
                      <Glyph of={LuDownload} size={14} />
                      Download JSON
                    </button>
                  </Row>
                </Group>
                <Group title="Danger">
                  <Row label="Clear tasks" hint="Documents and calendars stay.">
                    <button type="button" className="btn btn-flat">
                      Clear
                    </button>
                  </Row>
                  <Row
                    label="Delete account"
                    hint="Everything goes at once. There is no undo."
                  >
                    <button type="button" className="btn btn-destructive">
                      <Glyph of={LuTrash2} size={14} />
                      Delete
                    </button>
                  </Row>
                </Group>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
