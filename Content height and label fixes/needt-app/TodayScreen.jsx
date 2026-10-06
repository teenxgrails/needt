const { Card, CalendarStrip, CalendarDay, CalendarBlock, DayTimeline, FreeTime, Button, IconButton, Icon, FloatingAction, Chip, EmptyState, Tooltip, ToggleGroup } = window.NeedtDesignSystem_25d3c8;

/* A view that exists in the navigation but not yet in the product. It holds the
   space and says what will be here — it never pretends to be loading. */
function Stub({ title, text }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-3xl)", boxShadow: "var(--shadow-inset-ring)" }}>
      <EmptyState icon={<Icon name="calendar-days" size={24} />} text={text} />
    </div>
  );
}

function PageHeader({ title, meta, actions }) {
  return (
    <header style={{ display: "flex", alignItems: "center", gap: 16, height: 52, flex: "none" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 11 }}>
        <h1 style={{ margin: 0, font: "var(--type-page-title)", color: "var(--text-primary)" }}>{title}</h1>
        {meta ? <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>{meta}</span> : null}
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>{actions}</div>
    </header>
  );
}

const WEEK = [
  { weekday: "MON", date: 31, blocks: [{ title: "Standup", time: "10:30" }] },
  { weekday: "TUE", date: 1, today: true, blocks: [{ title: "Draft the launch brief", time: "09:00–10:30", movable: true, color: "var(--info)", priority: "high" }, { title: "Invoices", time: "yesterday", overdue: true }] },
  { weekday: "WED", date: 2, blocks: [{ title: "Deep work", time: "09:00–11:00", movable: true, color: "var(--accent)" }, { title: "Review", time: "15:00", done: true }] },
  { weekday: "THU", date: 3, blocks: [{ title: "1:1 Anna", time: "11:00" }] },
  { weekday: "FRI", date: 4, blocks: [{ title: "German", time: "18:00", movable: true, color: "var(--success)" }] },
  { weekday: "SAT", date: 5, blocks: [] },
  { weekday: "SUN", date: 6, blocks: [] }
];

/* The day. Decimal hours; the timeline derives every position from them.
   `movable` colours the rail — the scheduler placed it and can move it again. */
const DAY = { start: 8, end: 19, now: 14.33, nowLabel: "14:20" };
const PLACED = [
  { title: "Draft the launch brief", time: "09:00–10:30", start: 9, end: 10.5, movable: true, color: "var(--info)", priority: "high", parts: { closed: 1, total: 3 }, entry: "Pull last month's numbers", heat: 0.7 },
  { title: "Standup", time: "10:30–10:45", start: 10.5, end: 10.75 },
  { title: "Deep work — design system", time: "11:00–13:00", start: 11, end: 13, movable: true, color: "var(--accent)" },
  { title: "Lunch", time: "13:00–13:45", start: 13, end: 13.75 },
  { title: "Send invoices for August", time: "14:00–14:30 · overdue", start: 14, end: 14.5, movable: true, overdue: true },
  { title: "1:1 Anna", time: "16:00–16:30", start: 16, end: 16.5 },
  { title: "German — B2 unit 4", time: "18:00–19:00", start: 18, end: 19, movable: true, color: "var(--success)" }
];

function WeekStrip({ selected, onSelect }) {
  return (
    <CalendarStrip>
      {WEEK.map((d) => (
        <CalendarDay key={d.date} weekday={d.weekday} date={d.date} today={d.today} selected={selected === d.date} onClick={() => onSelect && onSelect(d.date)} style={{ flex: "1 1 0", minWidth: 96 }}>
          {d.blocks.map((b) => <CalendarBlock key={b.title} {...b} />)}
        </CalendarDay>
      ))}
    </CalendarStrip>
  );
}

function Legend() {
  return (
    <p style={{ margin: 0, font: "var(--type-meta)", color: "var(--text-muted)" }}>
      Grey rail: fixed. Coloured rail: the scheduler placed it and can move it again.
    </p>
  );
}

/* The one number the screen exists to answer, in the display serif rather than
   another 13px caption — and derived from the same items the timeline draws, so
   the headline and the visible gaps cannot disagree. */
function FreeTimeHeadline({ free }) {
  return (
    <div className="nt-freetime">
      <span className="nt-freetime-value">{free.left}</span>
      <span className="nt-freetime-caption">free left today · {free.total} in working hours</span>
    </div>
  );
}

function TodayScreen({ tasks, onOpen, onToggle, form, onForm, brief, dragProps, drag }) {
  const [selected, setSelected] = React.useState(1);
  const placed = PLACED;
  /* Unplaced = not done, no time, and not already on the day. Derived rather
     than held, so a task captured in the sidebar or dropped on a date appears
     and disappears here without a second source of truth. */
  const onDay = placed.map((b) => b.title);
  const queue = tasks.filter((t) => !t.done && !t.time && !t.noSlot && onDay.indexOf(t.title) === -1).map((t) => t.title);

  const free = FreeTime(placed, DAY.start, DAY.end, DAY.now);

  return (
    <>
      <div style={{ display: form === "prose" || form === "today" ? "none" : "flex", gap: 20, alignItems: "center", flex: "none", padding: "8px 0 16px" }}>
        {/* One object, not two: the date at display size with its weekday
            under it. The tab bar already says which screen this is, so the
            word "Today" is not repeated here — the number is the heading. */}
        {/* The day number is the heading, and it stands alone: a dotted
            numeric date reads as data, while the number with the month set
            beside it reads as a page in a diary. Weekday and week sit under
            the month, so nothing is said twice. */}
        <div style={{ flex: "none", display: "flex", alignItems: "flex-end", gap: 11, paddingRight: 4, paddingBottom: 2 }}>
          <span className="display" style={{ fontSize: 76, lineHeight: 0.82, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
            1
          </span>
          <span style={{ display: "flex", flexDirection: "column", gap: 1, paddingBottom: 4 }}>
            <span className="display" style={{ fontSize: 27, lineHeight: 1, color: "var(--text-tertiary)" }}>
              September
            </span>
            <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span className="display" style={{ fontSize: 15, lineHeight: 1.2, color: "var(--text-muted)" }}>
                Tuesday
              </span>
              <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                week 36
              </span>
            </span>
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <WeekStrip selected={selected} onSelect={setSelected} />
        </div>
      </div>

      {/* The week's brief: what the week is about, written by whoever is
          working on it. It grows downward and the page scrolls with it. */}
      <div className="scroll-inner" style={{ flex: 1, minHeight: 0, overflow: "auto", paddingBottom: 20 }}>
        {form === "today" && window.HomeToday
          ? <window.HomeToday tasks={tasks} onOpen={onOpen} onToggle={onToggle || (() => {})} dragProps={dragProps} drag={drag} />
          : <Brief onOpenTask={onOpen} form={form} onForm={onForm} marks={brief.marks} timeline={brief.timeline} />}
      </div>

    </>
  );
}

Object.assign(window, { TodayScreen, PageHeader, WeekStrip, Legend, FreeTimeHeadline, Stub, WEEK, DAY, PLACED });
