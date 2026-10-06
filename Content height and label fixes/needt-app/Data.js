/* THE DATA — one place where the facts live.
 *
 * Before this file the kit carried FOUR project registries (`RB_PROJECTS` by
 * key, `CV_PROJECTS` by name, `PROJECTS` in BlockDesigns, `GRID_PROJECT` as an
 * alias table) and the current date was typed out in six files. They drifted,
 * twice: the month disagreed with the week about which day 1 September was,
 * and a habit wore Operations' orange because a missing project fell back to
 * "ops". Neither was a rendering bug — both were two copies of one fact.
 *
 * So: one date, one project registry, one calendar registry, one habit list.
 * Screens keep their own seed of blocks, because a block's position in a day
 * is composition rather than data — but every hue, glyph and name they use is
 * resolved from here.
 */
const NEEDT = (function () {
  /* THE DATE. Everything that says "today" derives from this one value; the
     kit is a Tuesday in September so the week has a middle to sit in. */
  const today = new Date(2026, 8, 1);
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  /* THE PROJECTS. A project owns its hue and its glyph, and that is the whole
     colour policy of the product: the colour on screen is the person's own
     data. `id` is what blocks carry, `name` is what tasks carry — the two ways
     the same project gets referred to, resolved by one lookup. */
  const projects = [
    { id: "ops",    name: "Operations",    hue: "#FF7A45", glyph: "briefcase" },
    { id: "ds",     name: "Design system", hue: "#4C8DFF", glyph: "component" },
    { id: "german", name: "German",        hue: "#B072FF", glyph: "graduation-cap" },
    { id: "resale", name: "Resale",        hue: "#2FD08A", glyph: "package" },
    { id: "life",   name: "Life",          hue: "#FFC53D", glyph: "heart" }
  ];
  /* Aliases the seeds already use. Kept here rather than in the screens, so a
     renamed project is one edit. */
  const alias = { de: "german", personal: "life" };

  const byId = {};
  const byName = {};
  projects.forEach((p) => { byId[p.id] = p; byName[p.name] = p; });

  /* One resolver for both spellings, and one honest answer when there is no
     project: null. A fallback here is how a habit ended up orange. */
  function project(ref) {
    if (!ref) return null;
    return byId[ref] || byName[ref] || byId[alias[ref]] || null;
  }

  /* THE CALENDARS. An event has no project, so its calendar owns its hue —
     the same two slots as a task, different owners. */
  const calendars = {
    work:     { name: "Work",     color: "var(--accent)" },
    personal: { name: "Personal", color: "var(--success)" },
    family:   { name: "Family",   color: "var(--info)" }
  };

  /* THE HABITS. done: the last fourteen days, oldest first. A quota habit
     counts per week; a miss is an empty dot and nothing else. */
  const habits = [
    { id: "de", title: "German", at: "18:00", project: "German", quota: null,
      done: [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1] },
    { id: "walk", title: "Walk before work", at: "08:15", project: null, quota: null,
      done: [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0] },
    { id: "gym", title: "Gym", at: "07:00", project: null, quota: 3,
      done: [1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0] },
    { id: "read", title: "Read twenty pages", at: null, project: null, quota: null,
      done: [0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1] }
  ];

  /* THE STAGES. Named, ordered, and the same for every project — a per-project
     stage set is a second thing to maintain and nobody maintains it. */
  const stages = [
    { id: "todo", name: "To do" },
    { id: "doing", name: "In progress" },
    { id: "review", name: "In review" },
    { id: "done", name: "Done" }
  ];

  /* THE PEOPLE. A workspace has more than one person in it, and each of them
     owns a hue the same way a project does — the face is that hue, so who is
     carrying what is read at a glance rather than by name. */
  const people = [
    { id: "you",  name: "You",  initials: "MK", hue: "#FF7A45" },
    { id: "anna", name: "Anna", initials: "AN", hue: "#4C8DFF" },
    { id: "tom",  name: "Tom",  initials: "TM", hue: "#2FD08A" },
    { id: "lena", name: "Lena", initials: "LN", hue: "#B072FF" }
  ];
  const byPerson = {};
  people.forEach((p) => { byPerson[p.id] = p; });
  function person(ref) { return byPerson[ref] || byPerson.you; }

  /* THE TASKS. The seed both shells read. A task carries what it is, when it
     is due, how long it takes, and — where it applies — its parts, its money,
     its age and where the scheduler moved it from. */
  const tasks = [
    { id: 1, title: "Draft the launch brief", project: "Operations", tone: "info", time: "09:00", status: "in_progress", due: "4 Sep", est: 90, done: false, at: 9,
      holder: "you", waitsOn: { on: "anna", for: "the legal sign-off" }, stage: "doing", blockedBy: 6,
      heat: 0.7, parts: [{ title: "Pull last month's numbers", done: true }, { title: "Write the draft", done: false }, { title: "Send it for review", done: false }] },
    { id: 2, title: "Send invoices for August", project: "Operations", tone: "info", overdue: true, status: "todo", due: "31 Aug", est: 30, done: false, at: 9, movedFrom: "09:30", holder: "anna", stage: "doing" },
    { id: 3, title: "Review the form-row spec", project: "Design system", tone: "accent", time: "11:00", status: "in_progress", due: "2 Sep", est: 60, done: false, at: 11, holder: "you", stage: "review" },
    { id: 4, title: "German — B2 unit 4", project: "German", tone: "success", time: "18:00", status: "todo", due: "1 Sep", est: 60, done: false, at: 18, holder: "you", stage: "todo" },
    { id: 5, title: "Call the accountant back", project: null, status: "todo", est: 20, done: false, age: 34 },
    { id: 14, title: "Finish the tank graphic", project: "Design system", tone: "accent", status: "todo", due: "1 Sep", est: 240, done: false,
      at: 14, entry: "Open the artwork and pick the print side", holder: "you", waitsOn: { on: "tom", for: "the print files" }, stage: "doing" },
    { id: 15, title: "Reply to the Berlin buyer", project: "Resale", status: "todo", due: "1 Sep", est: 15, done: false, at: 9 },
    /* A FULL DAY. Home groups the day by `at` — morning under 12, afternoon
       under 17, evening after — so a day with three tasks in it renders three
       cards and two of the three group headings never appear. These fill the
       day the seed is supposed to depict: a person with a real Tuesday, not a
       demo with one task per heading. Two more overdue, so the wall beside
       today has something to argue with. */
    { id: 27, title: "Answer the supplier email", project: "Operations", tone: "info", status: "todo", due: "1 Sep", est: 15, done: false, at: 8, stage: "todo" },
    { id: 28, title: "Reply to Lena about the type scale", project: "Design system", tone: "accent", status: "todo", due: "1 Sep", est: 20, done: false, at: 9, holder: "lena", stage: "review" },
    { id: 29, title: "Pack the boots for pickup", project: "Resale", status: "todo", due: "1 Sep", est: 25, done: false, at: 10,
      parts: [{ title: "Wrap them", done: true }, { title: "Print the label", done: false }] },
    { id: 30, title: "Check the print proof", project: "Design system", tone: "accent", status: "in_progress", due: "1 Sep", est: 30, done: false, at: 11, holder: "you", stage: "doing" },
    { id: 31, title: "Call the tax office", status: "todo", due: "1 Sep", est: 20, done: false, at: 12, age: 9 },
    { id: 32, title: "Fix the form-row spacing", project: "Design system", tone: "accent", status: "in_progress", due: "1 Sep", est: 45, done: false, at: 13, holder: "you", stage: "doing" },
    { id: 33, title: "Photograph the two jackets", project: "Resale", status: "todo", due: "1 Sep", est: 40, done: false, at: 15,
      parts: [{ title: "Set up the light", done: false }, { title: "Shoot both", done: false }] },
    { id: 34, title: "Update the shipping sheet", project: "Operations", tone: "info", status: "todo", due: "1 Sep", est: 20, done: false, at: 16, stage: "todo" },
    { id: 35, title: "German — listening drill", project: "German", tone: "success", status: "todo", due: "1 Sep", est: 25, done: false, at: 19 },
    { id: 36, title: "Read the supplier brief", project: "Operations", tone: "info", status: "todo", due: "1 Sep", est: 30, done: false, at: 20 },
    { id: 37, title: "Renew the domain", project: "Operations", tone: "info", overdue: true, status: "todo", due: "29 Aug", est: 10, done: false, at: 9, stage: "todo" },
    { id: 38, title: "Send the August report", project: "Operations", tone: "info", overdue: true, status: "todo", due: "30 Aug", est: 35, done: false, at: 10, holder: "you", stage: "doing" },
    { id: 16, title: "Photograph the shell", project: "Resale", status: "todo", due: "2 Sep", est: 40, done: false, at: 10,
      parts: [{ title: "Set up the light", done: true }, { title: "Shoot the front", done: false }, { title: "Shoot the label", done: false }] },
    { id: 17, title: "Sign the factory quote", project: "Operations", status: "todo", due: "2 Sep", est: 45, done: false, at: 12,
      entry: "Open the quote PDF", holder: "tom", stage: "review", blockedBy: 26 },
    { id: 18, title: "Pick the courier for the batch", project: "Operations", status: "todo", due: "2 Sep", est: 30, done: false, at: 16, stage: "todo", blockedBy: 17 },
    { id: 19, title: "Read the VAT note", status: "todo", due: "3 Sep", est: 20, done: false, at: 18 },
    { id: 20, title: "Landing page copy", project: "Design system", status: "todo", due: "3 Sep", est: 120, done: false, at: 10,
      entry: "Write the first sentence", holder: "lena", stage: "doing" },
    { id: 21, title: "Ship the camera body", project: "Resale", status: "todo", due: "4 Sep", est: 45, done: false, at: 11, value: 1600 },
    { id: 22, title: "Write the September brief", project: "Operations", status: "todo", due: "4 Sep", est: 45, done: false, at: 15, holder: "anna", stage: "todo", blockedBy: 1 },
    { id: 23, title: "German — B2 unit 5", project: "German", status: "todo", due: "4 Sep", est: 60, done: false, at: 18 },
    { id: 24, title: "Archive August", status: "todo", due: "5 Sep", est: 20, done: false },
    { id: 25, title: "Two pairs of boots — list them", project: "Resale", status: "todo", due: "6 Sep", est: 45, done: false, at: 11, value: 5600 },
    { id: 26, title: "Read the two supplier contracts", project: "Operations", status: "todo", due: "7 Sep", est: 60, done: false, at: 14, holder: "tom", stage: "doing" },
    { id: 6, title: "Collect last quarter's numbers", project: "Operations", tone: "info", status: "todo", due: "3 Sep", est: 45, done: false, at: 9,
      entry: "Export the card statement",
      stage: "doing",
      parts: [{ title: "Export the card statement", done: false }, { title: "Export the invoices", done: false }] },
    { id: 7, title: "Pick a courier for the September batch", project: null, status: "todo", est: 45, done: false },
    { id: 8, title: "Write the weekly review", project: "Design system", tone: "accent", time: "Fri", status: "todo", due: "4 Sep", est: 60, done: false },
    { id: 9, title: "Reconcile the card statement", project: "Operations", tone: "info", est: 30, done: true, stage: "done" },
    { id: 10, title: "Book the dentist", project: null, est: 15, done: true },
    /* A money group: one task per thing, a sum on the group, and no slot in the
       day — the thing sells when it sells, so there is nothing to move. */
    { id: 11, title: "Arc'teryx shell — L", project: "Resale", status: "in_progress", value: 4200, earned: 3800, done: false, noSlot: true, heat: 1,
      parts: [{ title: "Photograph it", done: true }, { title: "List it", done: true }, { title: "Ship it", done: false }] },
    { id: 12, title: "Two pairs of boots", project: "Resale", status: "todo", value: 5600, done: false, noSlot: true, heat: 0.5,
      parts: [{ title: "Photograph them", done: false }, { title: "List them", done: false }, { title: "Ship them", done: false }] },
    { id: 13, title: "Camera body", project: "Resale", status: "todo", value: 1600, done: false, noSlot: true,
      parts: [{ title: "Photograph it", done: false }, { title: "List it", done: false }] }
  ];

  /* THE STREAK. A day counts as closed when everything with a deadline on it
     was closed — the definition that cannot be farmed by adding empty tasks,
     because an empty day has no deadline in it to close. `days` is the last
     fourteen, oldest first, the same window the habits use. */
  const closedDays = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0];
  function streak() {
    let n = 0;
    /* Today is still in progress, so it cannot be judged yet — counting it
       would report a break every morning and a repair every evening. The
       streak is what held up to and including yesterday; today joins it when
       the day is over. */
    for (let i = closedDays.length - 2; i >= 0 && closedDays[i]; i--) n++;
    return n;
  }

  function dateLabel(d) { return d.getDate() + " " + MONTHS[d.getMonth()]; }
  function shiftWeek(n) {
    const monday = new Date(today);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + n * 7);
    return monday;
  }

  /* THE CHAIN. What a task is waiting on, resolved: a person with a reason, or
     another task that has to close first. Derived on demand — a stored chain
     is a chain that disagrees with its own tasks by Thursday. */
  function blockerOf(t, list) {
    if (t.blockedBy) {
      const by = (list || tasks).filter((x) => x.id === t.blockedBy)[0];
      if (by && !by.done) return { kind: "task", task: by };
    }
    if (t.waitsOn) return { kind: "person", on: t.waitsOn.on, for: t.waitsOn.for };
    return null;
  }

  /* How many open tasks each task is holding up, counted through the chain —
     the only ranking worth having here, because it answers "what do I do first"
     rather than "what is urgent". */
  function unblocks(t, list) {
    const all = (list || tasks).filter((x) => !x.done);
    let n = 0;
    const seen = {};
    let front = [t.id];
    while (front.length) {
      const next = [];
      all.forEach((x) => {
        if (seen[x.id] || front.indexOf(x.blockedBy) < 0) return;
        seen[x.id] = 1;
        next.push(x.id);
        n += 1;
      });
      front = next;
    }
    return n;
  }

  /* Who is blocking how many of the tasks you hold. Derived, never stored —
     a count that is written down is a count that goes stale. */
  function blocking(list) {
    const out = {};
    (list || tasks).forEach((t) => {
      if (!t.done && t.waitsOn) out[t.waitsOn.on] = (out[t.waitsOn.on] || 0) + 1;
    });
    return out;
  }

  return { today, MONTHS, DOW, projects, project, calendars, habits, tasks,
    people, person, blocking, stages, blockerOf, unblocks,
    closedDays, streak, dateLabel, shiftWeek };
})();

Object.assign(window, { NEEDT });
