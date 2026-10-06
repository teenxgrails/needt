/* The inventory's later sheets: empty views, overlays, canvas objects, and the
   motif table. Split from blocks.html so neither file becomes unreadable. */
const NS2 = window.NeedtDesignSystem_25d3c8;
const { Card: C2, Icon: I2, Button: B2, IconButton: IB2, EmptyState, SidebarHint, Menu, MenuItem, MenuLabel, MenuSeparator, Checkbox: CB2, Tooltip: TT2, Skeleton, SkeletonRows, Chip: CH2, Input: IN2, FormRow, StatusDot: SD2 } = NS2;
const { Spec, Sheet, Row } = window;

/* ── D — empty views ───────────────────────────────────────────────────── */
function SheetStates() {
  return (
    <Sheet n="D" title="Empty views" note="One sentence plus one action: what would be here, and how it gets here. Sidebar sections get a 12px italic hint instead of blank space. No congratulation, no emoji.">
      <Row>
        <Spec name="Today — nothing placed" props={["EmptyState", "icon 24px", "action"]} height={168}>
          <EmptyState icon={<I2 name="calendar" size={24} />} text="Nothing is on the day yet. Capture a task and Needt places it into your free hours."
            action={<B2 size="sm" variant="flat" iconLeft={<I2 name="sparkles" size={13} />}>Plan my day</B2>} />
        </Spec>
        <Spec name="Tasks — all closed" props={["EmptyState", "text only"]} height={168}>
          <EmptyState icon={<I2 name="list-checks" size={24} />} text="Nothing open in this project. Closed tasks stay under Done." />
        </Spec>
        <Spec name="Calendars — none connected" props={["EmptyState", "action"]} height={168}>
          <EmptyState icon={<I2 name="calendar-off" size={24} />} text="No calendar is connected. Events you already agreed to will not appear on the grid until one is."
            action={<B2 size="sm" variant="flat" iconLeft={<I2 name="plus" size={13} />}>Connect a calendar</B2>} />
        </Spec>
        <Spec name="Documents — none pinned" props={["EmptyState"]} height={168}>
          <EmptyState icon={<I2 name="file-text" size={24} />} text="No document is pinned. Pin the ones you open every day." />
        </Spec>
        <Spec name="Sidebar hint" note="Where a section would be blank, one italic line — not an empty box." props={["SidebarHint"]} height={96}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
            <span style={{ font: "var(--type-meta-medium)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-quaternary)", padding: "0 6px" }}>UNPLACED</span>
            <SidebarHint>Nothing waiting. Anything you capture lands here first.</SidebarHint>
          </div>
        </Spec>
        <Spec name="Loading" note="Skeletons take the shape of what is coming, and never shimmer." props={["Skeleton", "SkeletonRows count"]} height={168}>
          <div style={{ display: "flex", flexDirection: "column", gap: 11, width: "100%" }}>
            <SkeletonRows count={4} />
            <div style={{ display: "flex", gap: 11 }}>{[0, 1, 2].map((i) => <Skeleton key={i} style={{ width: 84, height: 54, borderRadius: "var(--radius-lg)" }} />)}</div>
          </div>
        </Spec>
        <Spec name="Search — no match" note="Names the way out, in the user's own word." props={["query", "italic 12px"]} height={96}>
          <p style={{ margin: 0, font: "var(--type-meta)", fontStyle: "italic", color: "var(--text-muted)", textWrap: "pretty" }}>
            Nothing matches “buffer time”. Try a word from the setting itself, like “rail” or “buffer”.
          </p>
        </Spec>
        <Spec name="Field error" note="12px destructive under the field. Names the fix, never apologises." props={["invalid", "message"]} height={96}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
            <IN2 defaultValue="maksym.needt" invalid />
            <span style={{ font: "var(--type-meta)", color: "var(--destructive)" }}>Include an @ in the address.</span>
          </div>
        </Spec>
      </Row>
    </Sheet>
  );
}

/* ── E — overlays ──────────────────────────────────────────────────────── */
function SheetOverlays() {
  const [open, setOpen] = React.useState(true);
  return (
    <Sheet n="E" title="Dialogs and menus" note="Overlays arrive from the point they were opened from and leave at once. Menus are flat inside their own raised surface — a second lift would stack shadows. The task dialog explains the rail where the decision is made, not only in a legend under the canvas.">
      <Row cols="minmax(0,1.6fr) minmax(0,1fr)">
        <Spec name="TaskDialog" note="The product's dialog, live. Every row is FormRow: one 105px label column, one 32px row." pad={0} height={520}
          props={["open", "onClose", "FormRow label/hint", "DatePicker", "RadioGroup", "Switch"]}>
          <div style={{ position: "relative", width: "100%", height: 520 }}>
            {open ? <TaskDialog open onClose={() => setOpen(false)} /> : (
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                <B2 variant="flat" onClick={() => setOpen(true)}>Open the dialog</B2>
              </div>
            )}
          </div>
        </Spec>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Spec name="Menu" note="Radius 10 rows inside a radius 12 surface; a destructive item is the only coloured text." pad={11} height={200}
            props={["MenuLabel", "MenuItem icon/shortcut/submenu", "MenuItem variant='destructive'", "MenuSeparator"]}>
            <div style={{ width: 240 }}>
              <Menu>
                <MenuLabel>Task</MenuLabel>
                <MenuItem icon={<I2 name="pencil" size={14} />}>Edit</MenuItem>
                <MenuItem icon={<I2 name="list-plus" size={14} />}>Add a part</MenuItem>
                <MenuItem icon={<I2 name="clock" size={14} />} shortcut="⌘⇧S">Reschedule</MenuItem>
                <MenuItem icon={<I2 name="folder" size={14} />} submenu>Move to project</MenuItem>
                <MenuSeparator />
                <MenuItem variant="destructive" icon={<I2 name="trash-2" size={14} />} shortcut="⌫">Delete</MenuItem>
              </Menu>
            </div>
          </Spec>
          <Spec name="Tooltip" note="Explains a convention once, where it is used. Hover the mark." props={["label", "side"]} height={80}>
            <TT2 label="No rail: nothing to move. It closes when it closes." side="top">
              <span style={{ font: "var(--type-meta)", color: "var(--text-disabled)", boxShadow: "var(--shadow-inset-ring)", borderRadius: "var(--radius-sm)", padding: "4px 8px" }}>No slot</span>
            </TT2>
          </Spec>
          <Spec name="Status" note="A 6px dot, never a glyph — status never rides the calendar rail, which carries movability alone." props={["tone='accent'|'success'|'info'|'destructive'"]} height={80}>
            <span style={{ display: "flex", gap: 16 }}>
              <SD2 tone="accent" /><SD2 tone="success" /><SD2 tone="info" /><SD2 tone="destructive" />
            </span>
          </Spec>
        </div>
      </Row>
    </Sheet>
  );
}

/* ── F — brief canvas objects ──────────────────────────────────────────── */
const AUTHOR_INK = { you: "var(--text-primary)", needt: "var(--accent)", linear: "var(--info)", github: "var(--success)" };

/* Each specimen is the product's own Body(), given a real canvas object — the
   same contract as Sheet B's TaskRow. Nothing here is redrawn, so type and
   geometry cannot drift from Brief.jsx. */
function CanvasSpec({ o, w }) {
  const Body = window.Body;
  return (
    <div style={{ width: "100%", background: "var(--surface-raised)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-ring)", padding: 11 }}>
      <div style={{ width: w || "100%" }}>{Body ? <Body o={o} typing={false} onTyped={() => {}} /> : null}</div>
    </div>
  );
}

const O = {
  heading: { id: "s1", kind: "heading", author: "you", text: "Week 36 — the September batch" },
  text: { id: "s2", kind: "text", author: "you", text: "Legal sign-off is the only thing between us and the factory. Everything else can move." },
  needt: { id: "s3", kind: "text", author: "needt", text: "Three tasks are unplaced and 18 hours are open." },
  checklist: { id: "s4", kind: "checklist", author: "you", items: [
    { label: "Ask counsel for a date", done: true }, { label: "Send the print files", done: false }] },
  card: { id: "s5", kind: "card", author: "linear", title: "Print files to the factory", meta: "8–9 Sep · blocked", tone: "var(--info)" },
  metric: { id: "s6", kind: "metric", author: "needt", value: "18 h", caption: "free this week, Monday to Friday" },
  quote: { id: "s7", kind: "quote", author: "you", text: "Density over comfort — whitespace that costs a visible row costs a scroll.", source: "Needt design rules" },
  image: { id: "s8", kind: "image", author: "you", w: 220, h: 96 },
  drawing: { id: "s9", kind: "drawing", author: "you", w: 240, h: 96, path: "M20 100 C 60 24, 120 118, 168 60 S 230 20, 250 48" },
  /* w is explicit on every sized kind: Body() falls back to 320px, which is
     wider than the narrowest grid column's 313px content box. */
  email: { id: "s10", kind: "email", author: "github", w: 280, to: "anna@needt.app", subject: "Sign-off — where are we", body: "Short note: we need a date, not an answer." }
};

function SheetCanvas() {
  return (
    <Sheet n="F" title="Brief canvas objects" note="The week's brief is a field, not a form: ten object kinds, each carrying its author's ink. You write in your own colour; Needt writes in the accent, character by character; a connected agent writes in its own. Every specimen below is the product's Body() renderer.">
      <Row>
        <Spec name="heading" props={["kind='heading'", "author", "text", "x/y/w"]} height={90}><CanvasSpec o={O.heading} /></Spec>
        <Spec name="text" props={["kind='text'", "author='you'"]} height={90}><CanvasSpec o={O.text} /></Spec>
        <Spec name="text — written by Needt" note="Accent ink; on the live canvas it arrives per character rather than already written." props={["author='needt'", "typed=true"]} height={90}><CanvasSpec o={O.needt} /></Spec>
        <Spec name="checklist" props={["kind='checklist'", "items[{label,done}]"]} height={110}><CanvasSpec o={O.checklist} /></Spec>
        <Spec name="card" note="A task pulled in from an agent keeps that agent's ink on its rail." props={["kind='card'", "title", "meta", "tone"]} height={110}><CanvasSpec o={O.card} /></Spec>
        <Spec name="metric" note="A quantity you see rather than read: display serif, the third legitimate use after the date and free time." props={["kind='metric'", "value", "caption"]} height={130}><CanvasSpec o={O.metric} /></Spec>
        <Spec name="quote" props={["kind='quote'", "text", "source"]} height={110}><CanvasSpec o={O.quote} /></Spec>
        <Spec name="image" props={["kind='image'", "w/h"]} height={130}><CanvasSpec o={O.image} /></Spec>
        <Spec name="drawing" props={["kind='drawing'", "path"]} height={130}><CanvasSpec o={O.drawing} /></Spec>
        <Spec name="email" props={["kind='email'", "to/subject/body"]} height={130}><CanvasSpec o={O.email} /></Spec>
      </Row>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, paddingTop: 4 }}>
        {Object.keys(AUTHOR_INK).map((k) => (
          <span key={k} style={{ display: "flex", alignItems: "center", gap: 6, font: "var(--type-meta)", color: "var(--text-muted)" }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: AUTHOR_INK[k] }} />{k}
          </span>
        ))}
        <span style={{ font: "var(--type-meta)", color: "var(--text-disabled)" }}>Author ink — the object says who wrote it without a byline.</span>
      </div>
    </Sheet>
  );
}

/* ── G — the motif table ───────────────────────────────────────────────── */
const MOTIFS = [
  ["needt-breathe", "5.2s, loops", "cubic-bezier(.37,0,.63,1)", "Always, except during a focus session", "The wordmark inflates and settles: the app is running."],
  ["needt-mark-puff", "0.44s", "cubic-bezier(.2,.7,.2,1)", "Release after pressing the wordmark", "One puff, then the breath resumes."],
  ["needt-aura", "6s, loops", "ease-in-out", "A focus session is running", "All four screen corners breathe in the accent."],
  ["needt-focus-ring", "6s, loops", "ease-in-out", "A focus session is running", "The focus button breathes in time with the corners."],
  ["needt-flame-body / -core", "1.25s / 0.78s / 0.55s, loop", "ease-in-out", "Category impulse above zero", "Three layers on three clocks, so the shape never repeats."],
  ["needt-count-bump", "0.32s", "ease", "A part is closed or reopened", "The parts counter flashes accent once."],
  ["needt-drop-in", "0.14s", "ease", "A landing appears under the hand", "The outline scales up from its own top edge."],
  ["just-landed", "0.32s", "cubic-bezier(.2,.7,.2,1)", "A block is dropped", "Plays once and settles; nothing loops after a drop."],
  ["neighbour shove", "0.18s", "cubic-bezier(.2,.7,.2,1)", "A landing overlaps a block's start", "Blocks slide down by the landing's height and back."],
  ["ghost spring", "per frame, 0.32 of the remaining distance", "—", "A drag is live", "The card follows the pointer and leans into its velocity."],
  ["needt-veil-mark / -sweep", "0.26s / 0.52s", "cubic-bezier(.2,.7,.2,1) / (.4,0,.2,1)", "A route needs building", "The mark rises, one hairline sweeps under it."],
  ["needt-section-in", "0.22s", "ease", "A settings section opens", "The section arrives from below its heading."],
  ["needt-saved", "1.7s", "ease", "A setting writes itself", "“Saved” appears, holds, and leaves."],
  ["needt-auth-in", "0.34s", "cubic-bezier(.2,.7,.2,1)", "Account or setup screen mounts", "The whole column rises 10px."],
  ["needt-step-in / -back", "0.26s", "cubic-bezier(.2,.7,.2,1)", "Setup step changes", "The step enters from the side it came from."],
  ["needt-aurora", "9s, loops", "ease-in-out", "Account and setup screens", "The plate breathes in the accent behind the miniature day."],
  ["needt-mini-drop", "0.42s, staggered", "cubic-bezier(.2,.7,.2,1)", "Setup plate fills", "Each miniature block drops in on its own delay."],
  ["needt-mini-now", "14s, loops", "linear", "Account and setup screens", "The miniature now-line creeps down the plate."],
  ["needt-pop / needt-fade", "tokens/motion.css", "token curves", "Any overlay opens", "Menus, popovers, dialogs arrive from their origin."],
  ["typed reveal", "per character", "—", "Needt or an agent writes on the brief", "Text arrives as it is written, not already written."]
];

function SheetMotifs() {
  return (
    <Sheet n="G" title="Motif map" note="Every animation in the product, with the number to build it against. Anything not on this list is not in the product.">
      <div style={{ background: "var(--surface-raised)", borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-ring)", padding: "4px 16px 11px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "216px 200px 236px 260px minmax(0,1fr)", gap: "0 16px", alignItems: "center", height: 32 }}>
          {["Name", "Duration", "Curve", "Trigger", "What it says"].map((h) => (
            <span key={h} style={{ font: "var(--type-meta-medium)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-quaternary)" }}>{h}</span>
          ))}
        </div>
        {MOTIFS.map((m, i) => (
          <div key={m[0]} style={{ display: "grid", gridTemplateColumns: "216px 200px 236px 260px minmax(0,1fr)", gap: "0 16px", alignItems: "baseline", padding: "8px 0", boxShadow: "var(--border) 0 -1px 0 0 inset" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-primary)" }}>{m[0]}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>{m[1]}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>{m[2]}</span>
            <span style={{ font: "var(--type-meta)", color: "var(--text-secondary)" }}>{m[3]}</span>
            <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", textWrap: "pretty" }}>{m[4]}</span>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

Object.assign(window, { SheetStates, SheetOverlays, SheetCanvas, SheetMotifs });
window.dispatchEvent(new Event("needt-sheets"));
