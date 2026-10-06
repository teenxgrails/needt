const { Button, IconButton, Icon, Chip, SegmentedControl, ContextMenu, MenuItem, MenuSeparator, Tooltip, DocumentSheet, EmptyState } = window.NeedtDesignSystem_25d3c8;

const DOCS = [
  { title: "Launch brief — September", meta: "Edited 20 min ago", project: "Operations", tone: "info", lines: 7 },
  { title: "Needt design rules", meta: "Edited yesterday", project: "Design system", tone: "accent", lines: 9 },
  { title: "Scheduler — placement notes", meta: "Edited 3 days ago", project: "Design system", tone: "accent", lines: 5 },
  { title: "Weekly review, week 35", meta: "Edited 5 days ago", project: null, lines: 6 },
  { title: "German B2 — verbs to drill", meta: "Edited 1 week ago", project: "German", tone: "success", lines: 8 },
  { title: "Invoices and receipts", meta: "Edited 2 weeks ago", project: "Operations", tone: "info", lines: 4 }
];

/* 208×260 white card, radius 16; the inner sheet is radius 10 at the top with a
   ring — a page peeking out of the card. */
function DocCard({ doc, onOpen }) {
  return (
    <ContextMenu items={<><MenuItem icon={<Icon name="external-link" size={14} />} onClick={onOpen}>Open</MenuItem><MenuItem icon={<Icon name="star" size={14} />}>Star</MenuItem><MenuSeparator /><MenuItem variant="destructive" icon={<Icon name="trash-2" size={14} />}>Move to trash</MenuItem></>}>
      <div className="doc-card group" onClick={onOpen} style={{ width: 208, height: 260, background: "var(--surface-raised)", borderRadius: "var(--radius-3xl)", boxShadow: "var(--shadow-ring)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div className="doc-sheet" style={{ margin: "10px 10px 0", flex: 1, minHeight: 0, padding: "10px 12px 0", background: "var(--surface-raised)", borderRadius: "var(--radius-lg) var(--radius-lg) 0 0", boxShadow: "var(--shadow-ring)", overflow: "hidden" }}>
          <div style={{ font: "var(--type-meta-medium)", color: "var(--text-secondary)", marginBottom: 6 }}>{doc.title}</div>
          {Array.from({ length: doc.lines }).map((_, i) => (
            <div key={i} style={{ height: 3, borderRadius: 2, background: "var(--fill-4)", marginBottom: 5, width: i % 3 === 2 ? "62%" : "100%" }} />
          ))}
        </div>
        <div style={{ padding: 11, display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ font: "var(--type-ui-medium)", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</span>
            <span className="reveal-on-hover" style={{ marginLeft: "auto" }}>
              <IconButton label="Star" variant="ghost"><Icon name="star" size={14} /></IconButton>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ flex: "1 1 auto", minWidth: 0, font: "var(--type-meta)", color: "var(--text-quaternary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.meta}</span>
            {doc.project ? <Chip style={{ height: 20, flex: "none", maxWidth: 96 }}><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.project}</span></Chip> : null}
          </div>
        </div>
      </div>
    </ContextMenu>
  );
}

function DocsScreen({ onOpenDoc }) {
  const [tab, setTab] = React.useState("all");
  const shown = tab === "starred" ? [] : DOCS;
  return (
    <>
      <PageHeader title="Documents" meta="6 documents" actions={<>
        <Button variant="ghost" iconLeft={<Icon name="upload" size={16} />}>Import</Button>
        <Button iconLeft={<Icon name="plus" size={16} />} onClick={onOpenDoc}>New document</Button>
      </>} />
      <div style={{ paddingBottom: 16, flex: "none" }}>
        <SegmentedControl value={tab} onChange={setTab} label="Document filter" items={[
          { value: "all", label: "All", count: 6 }, { value: "starred", label: "Starred" }, { value: "shared", label: "Recent" }
        ]} />
      </div>
      <div style={{ minHeight: 0, overflow: "auto" }} className="scroll-inner">
        {shown.length === 0 ? (
          <EmptyState icon={<Icon name="star" size={24} />} text="No starred documents. Star a document to keep it in reach."
            action={<Button size="sm" onClick={() => setTab("all")}>Browse all</Button>} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 208px)", gap: 16 }}>
            {shown.map((d) => <DocCard key={d.title} doc={d} onOpen={onOpenDoc} />)}
          </div>
        )}
      </div>
    </>
  );
}

function DocumentScreen({ onBack }) {
  return (
    <>
      <PageHeader title="Launch brief — September" meta="Edited 20 min ago · 640 words" actions={<>
        <Button variant="ghost" iconLeft={<Icon name="arrow-left" size={16} />} onClick={onBack}>Documents</Button>
        <Button>Share</Button>
        <IconButton label="More"><Icon name="ellipsis" size={16} /></IconButton>
      </>} />
      <div style={{ minHeight: 0, overflowY: "auto", overflowX: "hidden", display: "flex", justifyContent: "center", position: "relative" }} className="scroll-inner">
        <DocumentSheet title="Launch brief — September" meta="Operations · draft">
          <p style={{ margin: "0 0 16px" }}>The scheduler places work into real free hours, so the calendar is the plan rather than a record of it. This document sets the scope for the September release and the three screens it touches.</p>
          <h2 style={{ font: "var(--weight-semibold) 18px / 22px var(--font-sans)", margin: "0 0 8px" }}>Scope</h2>
          <p style={{ margin: "0 0 16px" }}>One person opens the same four screens forty times a day. Every change has to survive that repetition: density over comfort, one hairline instead of a shadow, and no motion beyond a hover.</p>
          <ul style={{ margin: "0 0 16px", paddingLeft: 20 }}>
            <li>Tasks and events share one grid.</li>
            <li>The rail on a block means movability, and nothing else.</li>
            <li>Three themes ship together; light carries the identity.</li>
          </ul>
          <p style={{ margin: 0, color: "var(--text-tertiary)" }}>Open questions are collected at the end of the week and closed in the Friday review.</p>
        </DocumentSheet>
        <div className="toolbar-floating" style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 2, height: 45, padding: 4.5 }}>
          {["bold", "italic", "link", "list", "code", "highlighter"].map((n) => (
            <IconButton key={n} label={n} variant="ghost" style={{ height: 36, width: 36, borderRadius: 9999 }}><Icon name={n} size={16} /></IconButton>
          ))}
        </div>
      </div>
    </>
  );
}

Object.assign(window, { DocsScreen, DocumentScreen, DocCard, DOCS });
