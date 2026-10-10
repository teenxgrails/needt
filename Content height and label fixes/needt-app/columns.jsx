/* THE COLUMNS VIEW, ON REAL DATA — overdue plus seven days, five sorts, and
   the load in every header. The point to judge from a still: whether a day is
   survivable is readable without opening anything. */
const { ToggleGroup: CdToggle } = window.NeedtDesignSystem_25d3c8;

const CD_TASKS = [
  /* Overdue — the debt, with a place of its own. */
  { id: 1, day: "over", title: "Start calling Farfetch in Telz", priority: "now", est: 30, dueIn: -1, where: "Ops & Side / Admin", context: "Two attempts, no answer. Try the Zurich line.", tags: ["decision"], score: 96, at: 9, why: "Overdue longest, and it blocks the returns" },
  { id: 2, day: "over", title: "Buy the Swiss address", priority: "now", est: 20, dueIn: -1, where: "Ops & Side / Admin", context: "Needed before the next shipment leaves.", score: 91, at: 10 },
  { id: 3, day: "over", title: "Top up Redot", priority: "soon", est: 10, dueIn: -1, where: "Ops & Side / Admin", score: 74, at: 11 },

  { id: 10, day: 0, title: "Deutsch — 30 Minuten", priority: "soon", est: 30, dueIn: 0, at: 20, where: "Ops & Side / Admin & personal", context: "B1-Kurs, tatsächliches Niveau prüfen.", score: 62, why: "Fixed at 20:00, so everything else is placed around it" },
  { id: 11, day: 0, title: "Write one sentence into agent/DAILY_DRIVER.md §2", priority: "now", est: 15, dueIn: 0, at: 11, where: "DEMESURES / Unblocks three", context: "Yes or no. It releases April Su and Qianshiwear.", tags: ["decision"], score: 99, why: "Fifteen minutes, and three other tasks are waiting on it" },
  { id: 12, day: 0, title: "Decide: close the miss ledger at #14", priority: "now", est: 45, dueIn: 1, at: 14, where: "DEMESURES / Unblocks two", context: "The recommendation is written; it needs a yes.", tags: ["decision"], score: 88, why: "The recommendation is already written — only the decision is missing" },
  { id: 13, day: 0, title: "Decide the bulk shipment country", priority: "now", est: 40, dueIn: 2, at: 15, where: "DEMESURES / Unblocks two", context: "Red since 21.08 — eighteen days.", tags: ["money", "decision"], score: 84, why: "Eighteen days red; every day adds freight cost" },
  { id: 14, day: 0, title: "Press Run on daily-research-digest", priority: "soon", est: 10, dueIn: 0, at: 17, where: "Ops & Side / Admin", context: "Without it the web-search agent fails silently.", score: 70, why: "Ten minutes, and it stops a silent failure" },
  { id: 15, day: 0, title: "Order the Samsung", priority: "none", est: 15, dueIn: 4, at: 18, where: "Ops & Side / Admin", score: 30 },

  { id: 20, day: 1, title: "Qiyu — decide on the CHF 54.41 sample fee for two caps", priority: "now", est: 25, dueIn: 1, at: 10, where: "DEMESURES / Product", context: "Ten days red, above both agreed bands.", tags: ["money", "decision"], score: 95, why: "Ten days red and the sample cannot ship without it" },
  { id: 21, day: 1, title: "NO FUGAZI — message WhatsApp +44 7537 134878", priority: "now", est: 15, dueIn: 1, at: 11, where: "DEMESURES / Unblocks one", context: "T-090701. Two questions: finish and lead time.", score: 90, why: "One message unblocks the finish decision" },
  { id: 22, day: 1, title: "Ninghow — send the reply we owe them", priority: "now", est: 20, dueIn: 2, at: 12, where: "DEMESURES / Unblocks one", context: "Not a chase. They answered eleven days ago.", score: 86, why: "They answered eleven days ago and are waiting" },
  { id: 23, day: 1, title: "April Su — release the question on USD 6.50–8.50", priority: "soon", est: 20, dueIn: 3, at: 14, where: "DEMESURES / Unblocks one", context: "Best price on the board and confirmed twice.", tags: ["money"], score: 72 },
  { id: 24, day: 1, title: "Qianshiwear — break USD 10–15 into a band", priority: "soon", est: 25, dueIn: 3, at: 15, where: "DEMESURES / Unblocks one", context: "14/14 answered, in-house cutting confirmed.", score: 66 },
  { id: 25, day: 1, title: "Ace — send the reply: one price line, no postcode", priority: "later", est: 15, dueIn: 5, at: 16, where: "DEMESURES / Product", score: 48 },
  { id: 26, day: 1, title: "Confirm the courier account", priority: "none", est: 10, dueIn: 6, at: 17, where: "Ops & Side / Admin", score: 28 },
  { id: 27, day: 1, title: "Read the VAT note", priority: "none", est: 20, dueIn: 7, at: 18, where: "Ops & Side / Admin", score: 22 },

  { id: 30, day: 2, title: "Draw the DMS back-mark vector — 1.8 cm wide, tonal", priority: "now", est: 90, dueIn: 1, at: 10, where: "DEMESURES / Product", context: "Eleven days red. Gates every sample after it.", score: 94, why: "It gates every sample after it" },
  { id: 31, day: 2, title: "Secure the social handles — the strongest coherent set", priority: "now", est: 60, dueIn: 2, at: 12, where: "DEMESURES / Site", context: "P0 from the start, still not closed.", score: 89, why: "P0 since the beginning and still open" },
  { id: 32, day: 2, title: "Berlin lot, 12 pieces for EUR 885 — close buy / no-buy", priority: "now", est: 45, dueIn: 1, at: 14, where: "Ops & Side / Resale", context: "The verdict was buy, but the seller went quiet.", tags: ["money", "decision"], score: 87, why: "The verdict is in; only the seller is missing" },
  { id: 33, day: 2, title: "Gold Headwear — send the drafted reply", priority: "soon", est: 20, dueIn: 3, at: 15, where: "DEMESURES / Product", context: "The only cap route with an EU warehouse.", score: 68 },
  { id: 34, day: 2, title: "Needt — answer which screen goes into Figma first", priority: "soon", est: 30, dueIn: 3, at: 16, where: "Ops & Side / Needt", context: "The question has been unanswered for four days.", tags: ["decision"], score: 64 },
  { id: 35, day: 2, title: "Needt — approve a second git worktree", priority: "later", est: 15, dueIn: 5, at: 17, where: "Ops & Side / Needt", context: "Two agents on one checkout; they collide.", score: 44 },
  { id: 36, day: 2, title: "Write the September brief", priority: "later", est: 45, dueIn: 6, at: 18, where: "Ops & Side / Needt", score: 40 },
  { id: 37, day: 2, title: "Archive August", priority: "none", est: 20, dueIn: 8, at: 19, where: "Ops & Side / Admin", score: 18 },

  { id: 40, day: 3, title: "Finish the tank graphic", priority: "now", est: 480, dueIn: 1, at: 10, where: "DEMESURES / Product", context: "About eight hours. Latest safe date was the 25th.", score: 93, why: "Eight hours of work and the safe date has passed" },
  { id: 41, day: 3, title: "Chase the CHF 655 in returns — Brunschwig 426, Swarovski 229", priority: "now", est: 40, dueIn: 2, at: 14, where: "Ops & Side / Resale", context: "Neither has an expected date.", tags: ["money"], score: 85 },
  { id: 42, day: 3, title: "Decide: print on one side, or front and back", priority: "soon", est: 5, dueIn: 3, at: 15, where: "DEMESURES / Product", context: "Five minutes, with the artwork open.", tags: ["decision"], score: 71, why: "Five minutes, and the printer is waiting on it" },
  { id: 43, day: 3, title: "Create a fine-grained PAT for teenxgrails/demesures", priority: "soon", est: 20, dueIn: 4, at: 16, where: "Ops & Side / Admin", context: "The GitHub MCP cannot see the repo without it.", score: 60 },

  { id: 50, day: 4, title: "The site must accept a code before a single Pack C mail leaves", priority: "now", est: 60, dueIn: 1, at: 11, where: "DEMESURES / Site", context: "Artefact: one code entered on staging.", score: 92 },
  { id: 51, day: 4, title: "AS Colour — 60-second checkout test: ex- or incl-VAT", priority: "now", est: 15, dueIn: 2, at: 12, where: "DEMESURES / Site", context: "The VAT basis is still inferred, not known.", tags: ["money"], score: 83 },
  { id: 52, day: 4, title: "Delete or flag the src_first='test' row in signups", priority: "soon", est: 10, dueIn: 3, at: 14, where: "DEMESURES / Site", context: "It counts toward the waitlist total.", score: 61 },
  { id: 53, day: 4, title: "teenxgrailed.com — confirm the PayPal is the Swiss account", priority: "soon", est: 15, dueIn: 4, at: 15, where: "Ops & Side / Resale", context: "A Ukrainian PayPal is send-only.", tags: ["money"], score: 58 },
  { id: 54, day: 4, title: "Needt — put the five calendar defects into work", priority: "soon", est: 45, dueIn: 4, at: 16, where: "Ops & Side / Needt", context: "Cascade AND-condition bug, and four more.", score: 55 },

  { id: 60, day: 5, title: "Send Pack C — Kardamakis and Khan", priority: "now", est: 40, dueIn: 2, at: 11, where: "DEMESURES / Site", context: "Personal lines written from the city notes.", score: 80 },
  { id: 61, day: 5, title: "Needt — decide the project palette: four hues, breaks on the fifth", priority: "later", est: 30, dueIn: 5, at: 14, where: "Ops & Side / Needt", context: "Either widen the scale or accept repeats.", tags: ["decision"], score: 46 },
  { id: 62, day: 5, title: "Needt — docs/plans/10-design.md line 499 contradicts the current plan", priority: "later", est: 20, dueIn: 5, at: 15, where: "Ops & Side / Needt", context: "It says Figma is out of the picture.", score: 42 },
  { id: 63, day: 5, title: "Decide what happens to ~/Downloads/agentic-fundraising", priority: "none", est: 15, dueIn: 9, at: 16, where: "Ops & Side / Admin", context: "The extraction is done and the files are stale.", score: 20 },

  { id: 70, day: 6, title: "Read the two supplier contracts", priority: "later", est: 60, dueIn: 7, at: 12, where: "DEMESURES / Product", score: 38 }
];

const CD_DAYS = [
  { key: "over", label: "Overdue", overdue: true, free: null },
  { key: 0, label: "8 Sep · Today", today: true, free: 5 },
  { key: 1, label: "9 Sep · Tomorrow", free: 6 },
  { key: 2, label: "10 Sep · Thursday", free: 6 },
  { key: 3, label: "11 Sep · Friday", free: 5 },
  { key: 4, label: "12 Sep · Saturday", weekend: true, free: 3 },
  { key: 5, label: "13 Sep · Sunday", weekend: true, free: 3 },
  { key: 6, label: "14 Sep · Monday", free: 6 }
];

function Board({ theme, sort, onSort }) {
  const [tasks, setTasks] = React.useState(CD_TASKS);
  const [moved, setMoved] = React.useState(null);
  const [before, setBefore] = React.useState(null);

  function toggle(id) { setTasks((l) => l.map((t) => (t.id === id ? Object.assign({}, t, { done: !t.done }) : t))); }
  /* Rescheduling says where it put them, and can be taken back. */
  function reschedule() {
    const debt = tasks.filter((t) => t.day === "over" && !t.done);
    if (!debt.length) return;
    setBefore(tasks);
    setTasks((l) => l.map((t) => (t.day === "over" && !t.done ? Object.assign({}, t, { day: 0 }) : t)));
    setMoved(debt.length + (debt.length === 1 ? " task moved to today" : " tasks moved to today"));
  }
  function undo() { if (before) { setTasks(before); setBefore(null); setMoved(null); } }

  const days = CD_DAYS.map((d) => Object.assign({}, d, {
    tasks: tasks.filter((t) => t.day === d.key),
    action: d.overdue && tasks.some((t) => t.day === "over" && !t.done) ? "Reschedule" : null,
    onAction: reschedule
  })).filter((d) => !d.overdue || d.tasks.length);

  return (
    <div className={"app " + (theme === "paper" ? "paper" : theme)}
      style={{ display: "flex", flexDirection: "column", height: 660, padding: 16, background: "var(--background)",
        borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-ring)", overflow: "hidden" }}>
      <ColumnsView days={days} sort={sort} onSort={onSort} onToggle={toggle} onOpen={() => {}}
        onAdd={() => {}} onReschedule={reschedule} rescheduled={moved} onUndo={undo} />
    </div>
  );
}

function App() {
  const [sort, setSort] = React.useState("ai");
  return (
    <div className="app" style={{ minHeight: "100%", background: "var(--background)", padding: "20px 20px 60px", display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h1 style={{ margin: 0, font: "var(--type-page-title)", color: "var(--text-primary)" }}>Columns — the main view</h1>
        <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", maxWidth: 840, textWrap: "pretty" }}>
          A column per day and no hour scale, so nothing can lie about duration. Overdue is a column of its own, pinned
          first, with one action in its header. Each day states its LOAD, not just its count — the sum of the estimates
          against the free hours — and goes destructive when the day is oversubscribed, which is the only number here that
          changes what you do next. In Needt&apos;s order every card accounts for its rank, because an order nobody can
          account for is indistinguishable from a random one.
        </span>
      </header>
      <Board theme="dark" sort={sort} onSort={setSort} />
      <Board theme="paper" sort={sort} onSort={setSort} />
    </div>
  );
}

const __root = document.getElementById("root");
if (__root) ReactDOM.createRoot(__root).render(<App />);
