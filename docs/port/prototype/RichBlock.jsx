/* THE RICH BLOCK — the object the whole product is about.
 *
 * The grid block is the one place where three of the system's rules are
 * deliberately open, and only here: the body carries a solid fill, the fill is
 * a gradient, and the block may hold an image. Everywhere else — buttons,
 * panels, rows — the rules stand. A standout object is not a licence for
 * coloured furniture.
 *
 * WHAT CARRIES WHAT
 *   hue       the PROJECT owns it, so the colour on screen is the person's own
 *             data rather than a palette decision.
 *   edge      MOVABILITY, which had to move somewhere when colour took the
 *             body: a fixed block wears a hairline, a movable one wears
 *             nothing. Visible at every height, and it costs no room.
 *   tile      WHERE IT CAME FROM: the source's mark when there is one, the
 *             glyph for the kind of thing when there is not.
 *   payload   one row per fact, in a fixed order, each shown only if the data
 *             exists — so height is derived from content, never chosen.
 *
 * DENSITY
 *   The reference runs about 120px to the hour; this product runs 56px, so the
 *   whole day fits. Both are satisfied by spending the payload where it is
 *   worth something: the block happening NOW and the one happening NEXT open
 *   up, everything else stays one line. The richest block is always the one
 *   closest in time, which is also the one being looked at.
 */
/* This file's classes live in styles/docs.css. index.html links it; on a page
   that doesn't (mobile.html, the specimen pages) link it once from here. */
if (!document.querySelector('link[href^="styles/docs.css"]')) {
  const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "styles/docs.css?v=1"; document.head.appendChild(l);
}
const RbNS = window.NeedtDesignSystem_25d3c8;
const { Icon: RbIcon } = RbNS;

/* Each project owns a hue. Four here; the real set comes from the projects. */
/* The open header's height, and the only source of it: the tile plus the top
   padding above it. Every height calculation — the collapse budget here, the
   group's height on the surfaces — is derived from this rather than repeating
   a number that drifts. */
const RB_TILE = 34;
const RB_HEADER = RB_TILE + 9;

/* No project is a state, and it has a colour of its own: an opaque grey mixed
   against the surface, never a level of the text ladder — a ladder token is an
   alpha, and mixing one with transparent multiplies the two until the edge
   disappears. */
const RB_NEUTRAL = { name: null, icon: "list-checks",
  color: "color-mix(in oklab, var(--foreground) 42%, var(--surface-raised))" };

/* A view of the one registry in Data.js, keyed the way blocks refer to it. */
const RB_PROJECTS = {};
window.NEEDT.projects.forEach((p) => { RB_PROJECTS[p.id] = p; });

/* A source is a mark, not a decoration: it is here to say where the block came
   from. Marks are drawn as their own geometry rather than fetched, so the kit
   works offline and no brand asset is bundled. */
const RB_SOURCES = {
  slack: { name: "Slack", hue: "var(--brand-slack)", mark: "slack" },
  google: { name: "Google Calendar", hue: "var(--brand-google)", mark: "google" },
  apple: { name: "Apple Calendar", hue: "var(--brand-apple)", mark: "apple" },
  linear: { name: "Linear", hue: "var(--brand-linear)", mark: "linear" }
};

function rbMark(name, size) {
  const s = size || 17;
  if (name === "slack") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M5.1 15.1a2.1 2.1 0 1 1-2.1-2.1h2.1v2.1Zm1.1 0a2.1 2.1 0 0 1 4.2 0v5.3a2.1 2.1 0 0 1-4.2 0v-5.3Z" />
      <path d="M8.9 5.1a2.1 2.1 0 1 1 2.1-2.1v2.1H8.9Zm0 1.1a2.1 2.1 0 0 1 0 4.2H3.6a2.1 2.1 0 0 1 0-4.2h5.3Z" />
      <path d="M18.9 8.9a2.1 2.1 0 1 1 2.1 2.1h-2.1V8.9Zm-1.1 0a2.1 2.1 0 0 1-4.2 0V3.6a2.1 2.1 0 0 1 4.2 0v5.3Z" />
      <path d="M15.1 18.9a2.1 2.1 0 1 1-2.1 2.1v-2.1h2.1Zm0-1.1a2.1 2.1 0 0 1 0-4.2h5.3a2.1 2.1 0 0 1 0 4.2h-5.3Z" />
    </svg>
  );
  /* Stroke geometry on its own svg, so it cannot inherit the fill the marks
     above need — that mixture is what broke this glyph the first time. */
  if (name === "google") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd"
        d="M7.3 2c.7 0 1.2.6 1.2 1.3v1.2h7V3.3c0-.7.5-1.3 1.2-1.3s1.3.6 1.3 1.3v1.2h.5A2.5 2.5 0 0 1 21 7v11.5A2.5 2.5 0 0 1 18.5 21h-13A2.5 2.5 0 0 1 3 18.5V7a2.5 2.5 0 0 1 2.5-2.5H6V3.3C6 2.6 6.6 2 7.3 2Zm-1.6 9.4v2.2h3v-2.2h-3Zm4.6 0v2.2h3.4v-2.2h-3.4Zm5 0v2.2h3v-2.2h-3Zm-9.6 3.8v2.2h3v-2.2h-3Zm4.6 0v2.2h3.4v-2.2h-3.4Z" />
    </svg>
  );
  if (name === "apple") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.4 12.6c0-2 1.6-3 1.7-3.1-.9-1.4-2.4-1.5-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.4 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2.1 2.5 2 1-.1 1.4-.6 2.6-.6s1.5.6 2.6.6c1.1 0 1.8-1 2.4-2 .4-.6.7-1.3.9-2-1.6-.6-2.4-2.1-2.4-3.3Z" />
      <path d="M14.6 6.5c.6-.7.9-1.7.8-2.7-.9.1-1.9.6-2.5 1.3-.5.6-.9 1.6-.8 2.5 1 .1 1.9-.4 2.5-1.1Z" />
    </svg>
  );
  if (name === "linear") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3.2 14.3 9.7 20.8a9 9 0 0 1-6.5-6.5ZM3 11.6 12.4 21c.8-.1 1.6-.3 2.3-.6L3.6 9.3c-.3.7-.5 1.5-.6 2.3ZM4.5 7.7 16.3 19.5c.6-.4 1.1-.8 1.6-1.3L5.8 6.1c-.5.5-.9 1-1.3 1.6ZM7.4 4.6 19.4 16.6c1.6-2.3 1.9-5.3.7-7.9L15.3 3.9c-2.6-1.2-5.6-.9-7.9.7Z" />
    </svg>
  );
  return <RbIcon name={name} size={s} />;
}

/* THE TILE — a squircle with a body, not a flat swatch: the hue lifts toward
   the top-left where the light is, a hairline of light sits on the top edge,
   the inside is darkened at the bottom, and the whole thing casts. That is
   what makes a dock icon read as an object; the reference's flat square is the
   one thing it gets wrong. */
function RbTile({ hue, glyph, mark, size, locked }) {
  const s = size || 34;
  const r = Math.round(s * 0.295);
  return (
    <span className="docs-rb-rb-tile-1" style={{ width: s, height: s }}>
      <span className="docs-rb-rb-tile-2" aria-hidden="true"
        style={{ borderRadius: r, background: "linear-gradient(180deg, color-mix(in oklab, " + hue + " 90%, white) 0%, color-mix(in oklab, " + hue + " 96%, black) 100%)" }}>
        <span className="rb-tile-glyph docs-rb-rb-tile-3">
          {mark ? rbMark(mark, Math.round(s * 0.5)) : <RbIcon name={glyph} size={Math.round(s * 0.52)} />}
        </span>
      </span>
      {locked ? (
        <span className="docs-rb-rb-tile-4" aria-hidden="true" title="Fixed: the scheduler may not move it">
          <RbIcon name="lock" size={9} />
        </span>
      ) : null}
    </span>
  );
}

/* A payload pill. One shape for every fact that fits on a line. */
function RbPill({ glyph, children, hue, dark, strong }) {
  return (
    <span className={"docs-rb-rb-pill-1 docs-rb-rb-pill-s1" + (glyph ? " is-on" : "")}>
      {glyph ? (
        <span className="docs-rb-rb-pill-2" style={{ background: strong ? hue : "color-mix(in oklab, " + hue + " 34%, transparent)", color: strong ? "var(--text-on-fill)" : "color-mix(in oklab, " + hue + " 72%, white)" }}>
          <RbIcon name={glyph} size={11} />
        </span>
      ) : null}
      <span className="docs-rb-rb-pill-3">{children}</span>
    </span>
  );
}

/* The link preview: the page the block points at, as the page describes
   itself. An image is allowed here for the same reason the map is — it is the
   content, not decoration. */
function RbPreview({ og, hue, dark }) {
  return (
    <span className="docs-rb-rb-preview-1">
      <span className="docs-rb-rb-preview-2">
        {og.mark ? <span className="docs-rb-rb-preview-3">{rbMark(og.mark, 12)}</span> : null}
        <span className="docs-rb-rb-preview-4">{og.site}</span>
      </span>
      <span className="docs-rb-rb-preview-5">{og.title}</span>
    </span>
  );
}

/* THE BLOCK. `weight` is the whole density answer:
     "open"       now, or next — the payload is shown
     "compressed" every other block — one line
     "declined"   an event that was declined, or an hour blocked out: it keeps
                  its slot and says nothing, because the slot is the fact */
function rbDur(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? h + " h" + (m ? " " + m + " min" : "") : m + " min";
}

function rbMoney(v) { return "\u20AC" + String(v).replace(/\B(?=(\d{3})+(?!\d))/g, "\u2009"); }

/* HOW OLD IS IT. A task nobody has touched in three weeks is not urgent and
   not new — it is furniture, and it should read like furniture. The title
   steps down the text ladder rather than gaining a badge: a badge would make
   neglect louder than the work, which is backwards. */
function rbAgeInk(days) {
  if (!days || days < 21) return "var(--text-primary)";
  return days < 42 ? "var(--text-tertiary)" : "var(--text-quaternary)";
}

function rbShape(t, ctx) {
  const c = ctx || {};
  /* A task carries projectId; a calendar block seed carries `project` (an id
     or alias) or `where`. One resolver for all three. */
  const project = window.NEEDT ? window.NEEDT.project(t.projectId || t.project || t.where) : null;
  return {
    id: t.id,
    title: t.title,
    done: t.done,
    /* Who holds it and what it waits on travel with the task. */
    holder: t.holder,
    wait: t.TaskWait,
    /* A card has no hour to state and a row has a column for it, so the time
       span belongs to the grid alone. */
    from: c.layout === "block" ? t.from : null,
    to: c.layout === "block" ? t.to : null,
    est: t.estimatedMinutes,
    due: window.NEEDT ? window.NEEDT.dueLabel(t) : null,
    project: project ? project.id : null,
    hue: t.hue || (project ? project.color : null),
    source: t.source,
    movable: t.movable !== false,
    noSlot: t.noSlot,
    overdue: t.overdue,
    priority: t.priority,
    risk: t.risk,
    status: t.status,
    reason: c.reason ? t.why : null,
    value: t.value,
    earned: t.earned,
    age: t.age,
    movedFrom: t.movedFrom,
    group: t.group,
    parts: t.TaskPart,
    /* Dense surfaces drop what they cannot afford; the block decides the rest
       by height, down its own collapse order.
       The label comes from the RESOLVED project, never from the input: the
       seeds spell a project several ways — the grid by id, the columns by
       display name — and passing the input through printed `ops` on screen
       wherever the caller happened to use an id. Resolution is what the
       adapter is for. */
    where: c.dense ? null : (project ? project.name : (t.where || t.project)),
    entry: c.dense ? null : t.entry,
    note: c.dense ? null : (t.note || t.context)
  };
}

function RichBlock({ b, weight, height, dark, fit, onOpen, onToggle, remaining, onToggleTask, cols, onTogglePart, onPromotePart }) {
  const p = RB_PROJECTS[b.project] || RB_NEUTRAL;
  const src = b.source ? RB_SOURCES[b.source] : null;
  const atRisk = b.overdue || b.priority === "now";
  const hue = atRisk ? "var(--destructive)" : (b.hue || p.color);
  const wantOpen = weight === "open";
  /* A null height IS the request to fit: making `fit` a second way of saying
     the same thing is what let one call site say it and another forget. The
     block derives it, so no caller can get it wrong — and there is no magic
     default left over from when an open block ended in a map. */
  const fits = fit || height == null;
  const h = fits ? null : height;
  const open = fits || (wantOpen && h >= 56);

  /* THE ROW. 36px on hairlines with named columns, because it is the only
     arrangement you can scan by attribute: every date under Due, every
     estimate under Est, every amount under Value. It shares every mark with
     the block above — the tile, the risk ink, the age ladder, the money pair —
     so a task cannot look like two different things in two places. */
  if (weight === "row") {
    const parts = b.parts || [];
    const closed = parts.filter((x) => x.done).length;
    const whole = parts.length > 0 && closed === parts.length;
    return (
      <div className="group docs-rb-rich-block-1" data-drop="row"
        style={{ gridTemplateColumns: cols }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--fill-3)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
        <span className="docs-rb-rb-tile-3" onClick={(e) => { e.stopPropagation(); if (onToggle) onToggle(); }}>
          <span className="docs-rb-rich-block-2" aria-hidden="true" style={{ background: b.done ? hue : "transparent", boxShadow: b.done ? "none" : "inset 0 0 0 1.3px var(--text-disabled)" }}>
            {b.done ? <RbIcon name="check" size={9} /> : null}
          </span>
        </span>
        <span className="docs-rb-rich-block-3">
          <span className="docs-rb-rich-block-4" onClick={onOpen} title={b.title}
            style={{ color: b.done ? "var(--text-muted)" : rbAgeInk(b.age), textDecoration: b.done ? "line-through" : "none" }}>{b.title}</span>
          {parts.length ? (
            <span key={closed} className={"count-bump docs-rb-rich-block-5 docs-rb-rich-block-s1" + (whole ? " is-on" : "")} title={closed + " of " + parts.length + " parts closed"}>{closed}/{parts.length}</span>
          ) : null}
          {atRisk ? (
            <span className="docs-rb-rich-block-6">
              <span className="docs-rb-rich-block-7" aria-hidden="true" />
              <span className="docs-rb-rich-block-8">
                {b.risk || (b.overdue ? "Past due" : "Must not slip")}
              </span>
            </span>
          ) : null}
          {b.movedFrom ? (
            <span className="docs-rb-rich-block-9" title={"The scheduler moved it from " + b.movedFrom}>
              <RbIcon name="arrow-right" size={11} />{b.movedFrom}
            </span>
          ) : null}
          {b.wait && window.WsWaiting ? (
            <span className="docs-rb-rich-block-10"><window.WsWaiting wait={b.wait} /></span>
          ) : null}
          {window.WsFace ? (
            <span className="docs-rb-rich-block-11">
              <window.WsFace who={b.holder || "you"} size={18} />
            </span>
          ) : null}
        </span>
        <span className="docs-rb-rich-block-12">
          <span className="docs-rb-rich-block-13" aria-hidden="true" style={{ background: b.project ? p.color : "var(--text-disabled)" }} />
          <span className="docs-rb-rich-block-14">
            {b.where || "No project"}
          </span>
        </span>
        {b.noSlot ? (
          <span className="docs-rb-rich-block-15" title="No rail: nothing to move. It closes when it closes.">No slot</span>
        ) : (
          <span className={"docs-rb-rich-block-16 docs-rb-rich-block-s2" + (b.overdue ? " is-on" : "")}>{b.due || "—"}</span>
        )}
        <span className="docs-rb-rich-block-17">
          {b.est ? rbDur(b.est) : "—"}
        </span>
        <span className="docs-rb-rich-block-18">
          {b.earned ? <span className="docs-rb-rich-block-19" title="Received">{rbMoney(b.earned)}</span> : null}
          {b.value ? (
            <span className={"docs-rb-rich-block-20 docs-rb-rich-block-s3" + (b.earned ? " is-on" : "")} title={b.earned ? "Listed" : "Worth when it closes"}>{rbMoney(b.value)}</span>
          ) : (!b.earned ? <span className="docs-rb-rich-block-15">—</span> : null)}
        </span>
      </div>
    );
  }

  if (weight === "declined") {
    return (
      <span className="docs-rb-rich-block-21" onClick={onOpen} style={{ height: h }}>
        <RbIcon name="eye-off" size={16} />
        <span className="docs-rb-rich-block-22">
          {b.from} <span className="docs-rb-rich-block-23">›</span> {b.to}
        </span>
      </span>
    );
  }

  /* WHAT THE BLOCK SAYS, AND IN WHAT ORDER IT GIVES UP SAYING IT.
   *
   * Every fact has a height and a rank. The block is handed the height it has
   * — its duration on the grid, its content in the list — and spends it down
   * this list until the budget runs out. Nothing is ever clipped: a fact is
   * either shown whole or not shown.
   *
   * The order is by how much the fact changes what you do next. Where you have
   * to be outranks how to start, which outranks what it is about. */
  /* A group's tasks are not payload — they ARE the block, so they outrank
     every other fact and are spent first. */
  const group = b.group || null;
  const left = group ? group.filter((t) => !t.done) : null;
  const budget = [];
  if (group) {
    group.forEach((t, i) => budget.push({ k: "t" + i, zone: "task", h: 26, el: (
      <span className="docs-rb-rich-block-24" key={"t" + i} onClick={(e) => { e.stopPropagation(); if (onToggleTask) onToggleTask(i); }}>
        <span className="docs-rb-rich-block-25" aria-hidden="true" style={{ background: t.done ? hue : "transparent", boxShadow: t.done ? "none" : "inset 0 0 0 1.2px color-mix(in oklab, " + hue + " 60%, var(--text-quaternary))" }}>
          {t.done ? <RbIcon name="check" size={9} /> : null}
        </span>
        <span className={"docs-rb-rich-block-26 docs-rb-rich-block-s4" + (t.done ? " is-on" : "")}>{t.title}</span>
        <span className="docs-rb-rich-block-27">{t.estimatedMinutes}m</span>
      </span>
    ) }));
  }
  if (b.place) budget.push({ k: "place", zone: "meta", h: 29, el: <RbPill key="place" glyph="map-pin" hue={hue} dark={dark} strong>{b.place}</RbPill> });
  /* The alarm states itself in words, above everything else it might say. */
  if (atRisk) budget.push({ k: "risk", zone: "line", h: 20, el: (
    <span className="docs-rb-rich-block-28" key="risk">
      <span className="docs-rb-rich-block-29" aria-hidden="true" />
      <span className="docs-rb-rich-block-30">
        {b.risk || (b.overdue ? "Past due" : "Must not slip")}
      </span>
    </span>
  ) });
  if (b.reason && b.movable !== false) budget.push({ k: "why", zone: "line", h: 20, el: (
    <span className="docs-rb-rich-block-31" key="why" title={"Needt placed it here: " + b.reason}
      style={{ boxShadow: "inset 1.5px 0 0 0 color-mix(in oklab, " + hue + " 55%, transparent)" }}>{b.reason}</span>
  ) });
  if (b.movedFrom) budget.push({ k: "moved", zone: "line", h: 20, el: (
    <span className="docs-rb-rich-block-32" key="moved" title={"The scheduler moved this from " + b.movedFrom}>
      <span className="docs-rb-rich-block-33" aria-hidden="true">
        <RbIcon name="corner-down-right" size={12} />
      </span>
      <span className="docs-rb-rich-block-34">Moved from {b.movedFrom}</span>
    </span>
  ) });
  if (b.where) budget.push({ k: "where", zone: "meta", h: 18, el: (
    <span className="docs-rb-rich-block-35" key="where">{b.where}</span>
  ) });
  if (b.movable === false && b.reserve) budget.push({ k: "slack", zone: "line", h: 20, el: (
    <span className="docs-rb-rich-block-32" key="slack">
      {/* Status is a 6px dot, never a glyph — three states, and the good one
          has a sign of its own. */}
      <span className="docs-rb-rich-block-13" aria-hidden="true" style={{ background: b.reserve.state === "late" ? "var(--destructive)" : b.reserve.state === "tight" ? "var(--info)" : "var(--success)" }} />
      <span className="docs-rb-rich-block-36">{b.reserve.text}</span>
    </span>
  ) });
  if (b.entry) budget.push({ k: "entry", zone: "control", h: 28, el: (
    <button key="entry" type="button" className="rb-entry docs-rb-rich-block-37" onClick={(e) => e.stopPropagation()}
      style={{ "--rb-ink": "color-mix(in oklab, " + hue + " 70%, var(--text-primary))" }}>
      <span aria-hidden="true" className="rb-arrow docs-rb-rich-block-10">
        <RbIcon name="arrow-right" size={13} />
      </span>
      <span className="docs-rb-rich-block-38">
        <span className="rb-rest docs-rb-rich-block-39">{b.entry}</span>
        <span className="rb-hot docs-rb-rich-block-40" aria-hidden="true">Start the focus</span>
      </span>
      <span className="rb-cost docs-rb-rich-block-41">2 min</span>
    </button>
  ) });
  if (b.link) budget.push({ k: "link", zone: "meta", h: 29, el: <RbPill key="link" glyph="link" hue={hue} dark={dark}>{b.link}</RbPill> });
  if (b.attachment) budget.push({ k: "att", zone: "meta", h: 29, el: <RbPill key="att" glyph="paperclip" hue={hue} dark={dark}>{b.attachment}</RbPill> });
  if (b.og) budget.push({ k: "og", zone: "og", h: 60, el: <RbPreview key="og" og={b.og} hue={hue} dark={dark} /> });
  if (b.note) budget.push({ k: "note", zone: "line", h: 20, el: (
    <span className="docs-rb-rich-block-42" key="note">{b.note}</span>
  ) });

  const HEADER = RB_HEADER;
  let spent = HEADER;
  const shown = [];
  if (fits) {
    /* Nothing to ration: the container takes the height the facts need. */
    budget.forEach((f) => shown.push(f));
  } else if (open) {
    budget.forEach((f) => {
      if (spent + f.h + 7 <= h) { shown.push(f); spent += f.h + 7; }
    });
  }
  /* A group is not subject to the collapse order — its tasks are the block,
     so they all render and the area scrolls. */
  const spent2 = group && open ? budget : shown;
  const zone = (z) => spent2.filter((f) => (f.zone || "meta") === z);
  const lines = zone("line");
  const controls = zone("control");
  const meta = zone("meta");
  const tasks = spent2.filter((f) => /^t\d/.test(f.k));
  const preview = shown.filter((f) => f.k === "og")[0];

  return (
    <span className="docs-rb-rich-block-43" onClick={onOpen}
      style={{ height: fits ? "auto" : h, paddingBottom: fits && !meta.length && !controls.length ? 8 : 0, background: b.event
          ? "color-mix(in oklab, " + hue + " " + (dark ? 13 : 16) + "%, var(--surface-raised))"
          : "var(--surface-raised)", boxShadow: atRisk
          ? "inset 0 0 0 2px var(--destructive), var(--shadow-ring)"
          : b.noSlot
          ? "var(--shadow-ring)"
          : b.movable === false
          ? "inset 0 0 0 1.5px color-mix(in oklab, " + hue + " " + (dark ? 46 : 62) + "%, transparent), var(--shadow-ring)"
          : "inset 0 0 0 1px color-mix(in oklab, " + hue + " " + (dark ? 30 : 42) + "%, transparent), var(--shadow-ring)" }}>
      <span className={"docs-rb-rich-block-44 docs-rb-rich-block-s5" + (open ? " is-on" : "")}>
        {onToggle ? (
          <span className="docs-rb-rich-block-45" role="checkbox" aria-checked={!!b.done} aria-label={"Close " + b.title}
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            style={{ marginTop: open ? 1 : 0, boxShadow: "inset 0 0 0 1.6px " + (b.done ? "var(--success)" : hue), background: b.done ? "var(--success)" : "transparent" }}>
            {b.done ? <RbIcon name="check" size={9} /> : null}
          </span>
        ) : null}
        <span className="docs-rb-rich-block-46">
          <span className="docs-rb-rich-block-47">
            {atRisk ? (
              <span className="docs-rb-rich-block-29" aria-hidden="true" title={b.risk || (b.overdue ? "Past due" : "Must not slip")} />
            ) : null}
            <span className="docs-rb-rich-block-48" title={b.age >= 21 ? "Untouched for " + Math.round(b.age / 7) + " weeks" : undefined}
              style={{ color: b.done ? "var(--text-muted)" : rbAgeInk(b.age), textDecoration: b.done ? "line-through" : "none" }}>
              {group && !open ? (left.length ? left[0].title : b.title) : b.title}
            </span>
            {/* MONEY. A task that is worth something says what it is worth,
                where the group says what it costs — the same trailing slot,
                because both answer "what does this block carry". Two sums make
                the margin real: what it is listed for, and what came in. */}
            {b.value ? (
              <span className="docs-rb-rich-block-49">
                {b.earned ? (
                  <span className="docs-rb-rich-block-50" title="Received">
                    {rbMoney(b.earned)}
                  </span>
                ) : null}
                <span className={"docs-rb-rich-block-51 docs-rb-rich-block-s6" + (b.earned ? " is-on" : "")} title={b.earned ? "Listed" : "What it is worth"}>{rbMoney(b.value)}</span>
              </span>
            ) : null}
            {group ? (
              <span className="docs-rb-rich-block-52">
                {!open ? (
                  <span className="docs-rb-rich-block-53">
                    {group.length - left.length}/{group.length}
                  </span>
                ) : null}
                {/* The sum stays: it is what the block still costs the day, and
                    it goes down as tasks close — a quantity, not a tally. */}
                <span className="docs-rb-rich-block-54">
                  {rbDur(left.reduce((s, t) => s + (t.estimatedMinutes || 0), 0))}
                </span>
              </span>
            ) : null}
            {remaining != null ? (
              /* The hue lives in the PLATE and the ink comes from the text
                 ladder. Deriving both from the same hue makes their separation
                 hue-dependent — on a light ground a 30% plate is near-white
                 while a 74% ink is barely darkened, and the two converge — so
                 no pair of percentages can satisfy five hues at once. This way
                 the floor is guaranteed by construction, and it holds when a
                 project picks a colour nobody has seen yet. */
              <span className="docs-rb-rich-block-55" style={{ background: "color-mix(in oklab, " + hue + " 22%, var(--surface-raised))" }}>{"Left " + remaining + "m"}</span>
            ) : null}
          </span>
          {/* The chevron is the reference's one genuinely typographic idea: a
              time span reads as a direction, not as a subtraction. */}
          <span className="docs-rb-rich-block-56">
            {b.from ? <>{b.from} <span className="docs-rb-rich-block-57">›</span> {b.to}</> : b.est ? rbDur(b.est) : null}
          </span>
        </span>
      </span>

      {/* What the block says about itself: a tight text stack, no pills. */}
      {lines.length ? (
        <span className="docs-rb-rich-block-58">
          {lines.map((f) => f.el)}
        </span>
      ) : null}
      {/* A group's tasks are the block, so they scroll rather than collapse. */}
      {tasks.length ? (
        <span className={group && open ? "scroll-inner" : undefined}
          style={{ flex: group && open ? "1 1 auto" : "none", minHeight: 0, overflowY: group && open ? "auto" : "visible",
            display: "flex", flexDirection: "column", gap: 3, padding: "6px 10px 8px", minWidth: 0 }}>
          {tasks.map((f) => f.el)}
        </span>
      ) : null}
      {controls.length ? (
        <span className="docs-rb-rich-block-59">{controls.map((f) => f.el)}</span>
      ) : null}
      {preview ? (
        <span className="docs-rb-rich-block-60">{preview.el}</span>
      ) : null}
      {/* Metadata last, as a strip: where it lives, and what is attached. */}
      {meta.length ? (
        <span className="docs-rb-rich-block-61">
          {meta.map((f) => f.el)}
        </span>
      ) : null}
    </span>
  );
}

Object.assign(window, { RichBlock, rbShape, rbMoney, rbAgeInk, RbTile, RbPill, RbPreview, RB_PROJECTS, RB_NEUTRAL, RB_SOURCES, RB_HEADER, RB_TILE, rbMark, rbDur });
