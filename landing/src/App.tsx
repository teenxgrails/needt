import { useEffect } from "react"

export default function App() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const cleanups: Array<() => void> = []

    /* ---------- 1. reveal on scroll ---------- */
    const revealables = Array.from(document.querySelectorAll<HTMLElement>(".reveal"))
    if (reduce) {
      revealables.forEach((el) => el.classList.add("in"))
    } else {
      const ro = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("in")
              ro.unobserve(e.target)
            }
          })
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
      )
      revealables.forEach((el, i) => {
        el.style.transitionDelay = Math.min(i % 6, 4) * 55 + "ms"
        ro.observe(el)
      })
      cleanups.push(() => ro.disconnect())
    }

    /* ---------- 2. the schedule ---------- */
    const DAY_START = 9
    const HOURS = 8.5
    const PX_HOUR = 64

    const top = (t: number) => (t - DAY_START) * PX_HOUR
    const height = (a: number, b: number) => Math.max((b - a) * PX_HOUR - 4, 26)
    const clock = (t: number) => {
      const h = Math.floor(t)
      const m = Math.round((t - h) * 60)
      return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m
    }

    type Item = { id: string; title: string; kind: string; start: [number, number]; end: [number, number] }
    const PLAN: Item[] = [
      { id: "standup", title: "Standup", kind: "fixed", start: [9, 9.5], end: [9, 9.5] },
      { id: "copy", title: "Landing copy", kind: "auto", start: [10, 11.5], end: [10, 11.5] },
      { id: "invoices", title: "Invoices", kind: "auto", start: [15.5, 16], end: [11.5, 12] },
      { id: "lunch", title: "Lunch", kind: "fixed", start: [12, 13], end: [12, 13] },
      { id: "pricing", title: "Ship pricing page", kind: "auto", start: [14, 15.5], end: [15, 16.5] },
      { id: "kim", title: "1:1 with Kim", kind: "fixed", start: [16.5, 17], end: [16.5, 17] },
    ]
    const ARRIVAL = { id: "review", title: "Design review", kind: "fixed", at: [14, 15] as [number, number] }

    const track = document.getElementById("track")
    const hoursEl = document.getElementById("hours")
    const capText = document.getElementById("captiontext")
    const caption = document.getElementById("caption")
    const nowLine = document.getElementById("nowline")

    if (track && hoursEl && capText && caption && nowLine) {
      let nodes: Record<string, HTMLElement> = {}
      let timers: number[] = []

      for (let h = DAY_START; h <= DAY_START + Math.floor(HOURS) - 1; h++) {
        const row = document.createElement("div")
        row.className = "hour"
        row.textContent = clock(h)
        hoursEl.appendChild(row)
      }
      nowLine.style.top = top(13.6) + "px"

      const place = (el: HTMLElement, a: number, b: number) => {
        el.style.top = top(a) + "px"
        el.style.height = height(a, b) + "px"
        el.classList.toggle("short", b - a <= 0.5)
        const meta = el.querySelector<HTMLElement>(".m")
        if (meta) meta.textContent = clock(a) + " – " + clock(b)
      }

      const make = (item: { title: string; kind: string }, at: [number, number]) => {
        const el = document.createElement("div")
        el.className = "ev"
        el.setAttribute("data-kind", item.kind)
        el.innerHTML = '<div class="t"></div><div class="m"></div>'
        el.querySelector<HTMLElement>(".t")!.textContent = item.title
        place(el, at[0], at[1])
        track.appendChild(el)
        return el
      }

      const build = () => {
        timers.forEach(clearTimeout)
        timers = []
        track.querySelectorAll(".ev").forEach((n) => n.remove())
        nodes = {}
        PLAN.forEach((item) => {
          nodes[item.id] = make(item, item.start)
        })
        caption.classList.remove("live")
        capText.textContent = "Your day as you left it."
      }

      const after = (ms: number, fn: () => void) => {
        timers.push(window.setTimeout(fn, ms))
      }

      const run = () => {
        build()
        if (reduce) {
          PLAN.forEach((i) => place(nodes[i.id], i.end[0], i.end[1]))
          make(ARRIVAL, ARRIVAL.at)
          capText.textContent = "Design review landed at 14:00. Two blocks moved. Nothing was dropped."
          return
        }

        after(1500, () => {
          caption.classList.add("live")
          capText.textContent = "Design review invite accepted — 14:00 to 15:00."
          const el = make(ARRIVAL, ARRIVAL.at)
          el.classList.add("entering")
          nodes[ARRIVAL.id] = el
          requestAnimationFrame(() => {
            requestAnimationFrame(() => el.classList.remove("entering"))
          })
        })

        after(2900, () => {
          capText.textContent = "It lands on Ship pricing page. Rebuilding the rest of the day."
          nodes.pricing.classList.add("moved")
        })

        after(3700, () => {
          PLAN.forEach((item) => {
            if (item.start[0] !== item.end[0]) {
              place(nodes[item.id], item.end[0], item.end[1])
              nodes[item.id].classList.add("moved")
            }
          })
        })

        after(4800, () => {
          capText.textContent = "Ship pricing page → 15:00. Invoices → 11:30. Still done before your 1:1."
        })

        after(7200, () => {
          caption.classList.remove("live")
          capText.textContent = "Two blocks moved. Nothing was dropped, and nothing needed you."
          Object.keys(nodes).forEach((k) => nodes[k].classList.remove("moved"))
        })
      }

      let started = false
      const so = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting && !started) {
              started = true
              run()
              so.disconnect()
            }
          })
        },
        { threshold: 0.35 },
      )
      so.observe(track)
      cleanups.push(() => so.disconnect())

      const replayBtn = document.getElementById("replay")
      const seeBtn = document.getElementById("see")
      const onReplay = () => run()
      const onSee = () => {
        document.querySelector(".stage")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" })
        run()
      }
      replayBtn?.addEventListener("click", onReplay)
      seeBtn?.addEventListener("click", onSee)
      cleanups.push(() => {
        replayBtn?.removeEventListener("click", onReplay)
        seeBtn?.removeEventListener("click", onSee)
        timers.forEach(clearTimeout)
      })
    }

    /* ---------- 3. steps 01 02 03 ---------- */
    const steps = Array.from(document.querySelectorAll<HTMLElement>(".step"))
    const panels = Array.from(document.querySelectorAll<HTMLElement>(".panel"))

    const lightStep = (n: string | null) => {
      steps.forEach((s) => s.classList.toggle("on", s.getAttribute("data-step") === String(n)))
      panels.forEach((p) => p.classList.toggle("on", p.getAttribute("data-panel") === String(n)))
    }

    const stepHandlers: Array<[HTMLElement, () => void]> = []
    steps.forEach((s) => {
      const handler = () => lightStep(s.getAttribute("data-step"))
      s.addEventListener("click", handler)
      stepHandlers.push([s, handler])
    })
    cleanups.push(() => stepHandlers.forEach(([s, h]) => s.removeEventListener("click", h)))

    if (!reduce) {
      const po = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) lightStep(e.target.getAttribute("data-step"))
          })
        },
        { threshold: 0.6, rootMargin: "-20% 0px -30% 0px" },
      )
      steps.forEach((s) => po.observe(s))
      cleanups.push(() => po.disconnect())
    }

    /* ---------- 4. sticky mobile CTA ---------- */
    const sticky = document.getElementById("stickycta")
    const heroCta = document.querySelector(".hero-cta")
    if (sticky && heroCta) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => sticky.classList.toggle("on", !e.isIntersecting))
        },
        { threshold: 0 },
      )
      io.observe(heroCta)
      cleanups.push(() => io.disconnect())
    }

    /* ---------- 5. FAQ — one open at a time ---------- */
    const qas = Array.from(document.querySelectorAll<HTMLDetailsElement>(".qa"))
    const qaHandlers: Array<[HTMLDetailsElement, () => void]> = []
    qas.forEach((d) => {
      const handler = () => {
        if (!d.open) return
        qas.forEach((o) => {
          if (o !== d) o.open = false
        })
      }
      d.addEventListener("toggle", handler)
      qaHandlers.push([d, handler])
    })
    cleanups.push(() => qaHandlers.forEach(([d, h]) => d.removeEventListener("toggle", h)))

    return () => cleanups.forEach((fn) => fn())
  }, [])

  return (
    <>
      <header>
        <div className="wrap" style={{ padding: "0 16px" }}>
          <nav className="bar">
            <a className="mark" href="#top">
              <span></span>Needt
            </a>
            <div className="navlinks">
              <a href="#how">How it works</a>
              <a href="#agent">The agent</a>
              <a href="#inside">Inside</a>
              <a href="#pricing">Pricing</a>
              <a href="#who">Who</a>
            </div>
            <a className="btn btn-solid" href="https://use.needt.app">
              Start free
            </a>
          </nav>
        </div>
      </header>

      <main id="top">
        {/* ============ HERO ============ */}
        <section className="hero">
          <div className="wrap">
            <p className="eyebrow reveal">A planner that reschedules itself</p>
            <h1 className="display reveal">Something always moves.</h1>
            <p className="lede reveal">
              A meeting lands. A task runs long. Needt rebuilds the rest of the day around it — and shows you the day it
              made before you keep it.
            </p>
            <div className="hero-cta reveal">
              <a className="btn btn-solid btn-lg" href="https://use.needt.app">
                Start my free plan
              </a>
              <button className="btn btn-ghost btn-lg" id="see">
                See it move
              </button>
            </div>
            <p className="hero-note reveal">Free while it is in beta. No card.</p>

            <div className="stage reveal">
              <div className="window">
                <div className="chrome">
                  <span className="dot r"></span>
                  <span className="dot y"></span>
                  <span className="dot g"></span>
                  <span className="label">Tuesday</span>
                  <button className="replay" id="replay">
                    Replay
                  </button>
                </div>
                <div className="day">
                  <div className="hours" id="hours"></div>
                  <div className="track" id="track">
                    <div className="now" id="nowline"></div>
                  </div>
                </div>
                <div className="caption" id="caption">
                  <span className="pulse"></span>
                  <span id="captiontext">Your day as you left it.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ CONNECTIONS ============ */}
        <section className="strip">
          <div className="wrap">
            <div className="strip-inner reveal">
              <p className="eyebrow">Works with the calendar you already have</p>
              <span className="logo">
                <i>G</i>Google Calendar
              </span>
              <span className="logo">
                <i>O</i>Outlook
              </span>
              <span className="logo">
                <i>C</i>CalDAV
              </span>
              <span className="logo">
                <i>@</i>Your inbox
              </span>
              <span className="logo">
                <i>⌘</i>Command palette
              </span>
            </div>
          </div>
        </section>

        {/* ============ STEPS ============ */}
        <section className="steps" id="how">
          <div className="wrap">
            <h2 className="reveal" style={{ maxWidth: "20ch", marginBottom: "44px" }}>
              It works the way a good assistant would.
            </h2>
            <div className="steps-grid">
              <div id="steplist">
                <div className="step on" data-step="1">
                  <p className="eyebrow">01</p>
                  <h3>Everything arrives in one place</h3>
                  <p>
                    Google Calendar, Outlook and CalDAV sync into Needt and stay synced. Tasks come from your inbox,
                    from ⌘K, or from a sentence typed anywhere. Nothing lives in a second app you have to remember to
                    open.
                  </p>
                </div>
                <div className="step" data-step="2">
                  <p className="eyebrow">02</p>
                  <h3>The work gets placed, not listed</h3>
                  <p>
                    Needt reads the week you actually have — meetings, working hours, the buffer you need between things
                    — and puts each task in a slot where it fits. A list tells you what is undone. A schedule tells you
                    when.
                  </p>
                </div>
                <div className="step" data-step="3">
                  <p className="eyebrow">03</p>
                  <h3>You see the day before you keep it</h3>
                  <p>
                    Every reschedule is shown as a proposal: what moved, where it went, what stayed put. Keep it, or
                    undo it and the day snaps back. Nothing is rearranged behind your back.
                  </p>
                </div>
              </div>

              <div className="step-visual">
                <div className="panel on" data-panel="1">
                  <div className="srcs">
                    <div className="src">
                      <i>G</i>Google Calendar
                    </div>
                    <div className="src">
                      <i>O</i>Outlook
                    </div>
                    <div className="src">
                      <i>C</i>CalDAV
                    </div>
                    <div className="src">
                      <i>@</i>Task from email
                    </div>
                    <div className="src">
                      <i>⌘</i>Command palette
                    </div>
                    <div className="src">
                      <i>+</i>Quick add
                    </div>
                  </div>
                </div>
                <div className="panel" data-panel="2">
                  <div className="slots">
                    <div className="slot blocked">09:00 — Standup · fixed</div>
                    <div className="slot taken">10:00 — Landing copy</div>
                    <div className="slot">11:30 — open · 30 min</div>
                    <div className="slot blocked">12:00 — Lunch · fixed</div>
                    <div className="slot taken">14:00 — Ship pricing page</div>
                    <div className="slot">15:30 — open · 60 min</div>
                    <div className="slot blocked">16:30 — 1:1 with Kim · fixed</div>
                  </div>
                </div>
                <div className="panel" data-panel="3">
                  <div className="diff">
                    <div className="row">
                      <span className="name">Ship pricing page</span>
                      <span className="from">14:00</span>
                      <span className="arw">→</span>
                      <span className="to">15:00</span>
                    </div>
                    <div className="row">
                      <span className="name">Invoices</span>
                      <span className="from">15:30</span>
                      <span className="arw">→</span>
                      <span className="to">11:30</span>
                    </div>
                    <div className="row">
                      <span className="name">1:1 with Kim</span>
                      <span className="to" style={{ color: "var(--slate)" }}>
                        16:30 · unchanged
                      </span>
                    </div>
                    <div className="diff-actions">
                      <button className="btn btn-solid" style={{ padding: "12px 20px", fontSize: "15px" }}>
                        Keep this day
                      </button>
                      <button className="btn btn-ghost" style={{ padding: "12px 20px", fontSize: "15px" }}>
                        Undo
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="spectrum"></div>

        {/* ============ THE AGENT ============ */}
        <section className="agent" id="agent">
          <div className="wrap">
            <div className="agent-head">
              <p className="eyebrow reveal" style={{ marginBottom: "16px" }}>
                The agent
              </p>
              <h2 className="reveal">Not a chat box bolted onto a calendar.</h2>
              <p className="lede reveal" style={{ marginTop: "18px", maxWidth: "52ch" }}>
                Twenty-two tools that act on your real schedule, your real pages and your real inbox — and one that
                remembers when you correct it.
              </p>
            </div>

            <div className="agent-grid">
              <div className="cap reveal">
                <div className="ic">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 7h16M4 12h11M4 17h7" />
                  </svg>
                </div>
                <h4>Turns a paragraph into a week</h4>
                <p>
                  Dump everything you are carrying in one message. It comes back as separate tasks, sized, and placed in
                  slots that exist.
                </p>
                <div className="tools">
                  <span className="tool">parse_brain_dump</span>
                  <span className="tool">create_task</span>
                  <span className="tool">auto_schedule</span>
                  <span className="tool">query_schedule</span>
                </div>
              </div>

              <div className="cap reveal">
                <div className="ic">
                  <svg viewBox="0 0 24 24">
                    <path d="M3 6h13M3 12h18M3 18h9" />
                    <path d="M18 4l3 3-3 3" />
                  </svg>
                </div>
                <h4>Moves things, and asks first</h4>
                <p>
                  Edits, reschedules and deletions that change your day require confirmation. The proposal is shown
                  before anything is applied.
                </p>
                <div className="tools">
                  <span className="tool">edit_task</span>
                  <span className="tool">delete_task</span>
                  <span className="tool">manage_projects</span>
                </div>
              </div>

              <div className="cap reveal">
                <div className="ic">
                  <svg viewBox="0 0 24 24">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 8l9 6 9-6" />
                  </svg>
                </div>
                <h4>Reads your inbox, never sends</h4>
                <p>
                  Search locally synced mail, open one message, turn it into a scheduled task. It has no ability to send
                  anything on your behalf.
                </p>
                <div className="tools">
                  <span className="tool">search_mail</span>
                  <span className="tool">get_message</span>
                  <span className="tool">create_task_from_email</span>
                </div>
              </div>

              <div className="cap wide reveal">
                <div className="ic">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 3a4 4 0 00-4 4v1a3 3 0 000 6v2a3 3 0 003 3h1" />
                    <path d="M12 3a4 4 0 014 4v1a3 3 0 010 6v2a3 3 0 01-3 3h-1" />
                  </svg>
                </div>
                <h4>It remembers what you correct</h4>
                <p>
                  Correct it once and it keeps the correction. Never schedule deep work before ten. Always leave thirty
                  minutes after a call. The kind of thing you should not have to repeat, and here you do not.
                </p>
                <p className="quote">
                  “Don&apos;t put anything before 10am on Mondays.”
                  <span>remembered · applied to every reschedule since</span>
                </p>
                <div className="tools" style={{ marginTop: "16px" }}>
                  <span className="tool">remember</span>
                  <span className="tool">forget</span>
                  <span className="tool">list_memories</span>
                </div>
              </div>

              <div className="cap reveal">
                <div className="ic">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 8v4l3 2" />
                  </svg>
                </div>
                <h4>Runs focus, reports honestly</h4>
                <p>
                  Start a session against a block that already exists, stop it, and read the week back — time actually
                  spent, not time intended.
                </p>
                <div className="tools">
                  <span className="tool">start_focus_session</span>
                  <span className="tool">stop_focus_session</span>
                  <span className="tool">get_focus_stats</span>
                </div>
              </div>

              <div className="cap reveal">
                <div className="ic">
                  <svg viewBox="0 0 24 24">
                    <path d="M5 4h11l3 3v13H5z" />
                    <path d="M8 11h8M8 15h5" />
                  </svg>
                </div>
                <h4>Writes into your pages</h4>
                <p>
                  Finds the right document, proposes the edit, and waits. Your notes are never rewritten without you
                  seeing the change first.
                </p>
                <div className="tools">
                  <span className="tool">list_pages</span>
                  <span className="tool">search_pages</span>
                  <span className="tool">propose_page_changes</span>
                </div>
              </div>
            </div>

            <div className="models reveal">
              <span className="lbl">Bring your own model</span>
              <div className="chipset">
                <span className="chip">Needt hosted</span>
                <span className="chip">Anthropic</span>
                <span className="chip">OpenAI</span>
                <span className="chip">Grok</span>
                <span className="chip">GLM</span>
                <span className="chip">Custom endpoint</span>
                <span className="chip soon">MCP server</span>
              </div>
            </div>
          </div>
        </section>

        {/* ============ INSIDE ============ */}
        <section className="feat" id="inside">
          <div className="wrap">
            <div className="feat-head">
              <p className="eyebrow reveal" style={{ marginBottom: "16px" }}>
                Inside
              </p>
              <h2 className="reveal">The rest of the week lives here too.</h2>
            </div>
            <div className="cards">
              <div className="card reveal">
                <span className="tag">Boards</span>
                <p>
                  Custom columns, drag and drop, saved views — and documents in the same workspace. A task on a board is
                  the same task on your calendar, not a copy of it.
                </p>
                <div className="mock">
                  <div className="mk">
                    <div className="mk-bar">
                      <i></i>
                      <i></i>
                      <i></i>
                      <b>Launch</b>
                    </div>
                    <div className="mk-board">
                      <div className="mk-col">
                        <span>To do</span>
                        <div className="mk-t">Pricing copy</div>
                        <div className="mk-t">Outreach list</div>
                        <div className="mk-t">Legal review</div>
                        <div className="mk-t">Creem products</div>
                      </div>
                      <div className="mk-col">
                        <span>Doing</span>
                        <div className="mk-t b">Ship pricing page</div>
                        <div className="mk-t a">Landing copy</div>
                        <div className="mk-t">Agent memory</div>
                      </div>
                      <div className="mk-col">
                        <span>Done</span>
                        <div className="mk-t">Domain + DNS</div>
                        <div className="mk-t">Calendar sync</div>
                        <div className="mk-t">Outlook app</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card reveal">
                <span className="tag">Focus</span>
                <p>
                  Not a separate screen. The block you chose grows, the rest of the day dims, and the timer runs against
                  the slot that was already there.
                </p>
                <div className="mock">
                  <div className="mk">
                    <div className="mk-bar">
                      <i></i>
                      <i></i>
                      <i></i>
                      <b>Focus · 68%</b>
                    </div>
                    <div className="mk-focus">
                      <div className="ring">
                        <b>41:12</b>
                      </div>
                      <div className="mk-dim">
                        <div className="f"></div>
                        <div className="live"></div>
                        <div className="f"></div>
                        <div className="f"></div>
                      </div>
                      <div className="mk-dim" style={{ flexBasis: "100%" }}>
                        <div className="f"></div>
                        <div className="f"></div>
                        <div className="f"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card reveal">
                <span className="tag">Moodboards</span>
                <p>
                  References, sketches and screenshots on a full Excalidraw canvas that belongs to the project it came
                  from — not to a tab you lose by Thursday.
                </p>
                <div className="mock">
                  <div className="mk">
                    <div className="mk-bar">
                      <i></i>
                      <i></i>
                      <i></i>
                      <b>Identity</b>
                    </div>
                    <div className="mk-canvas">
                      <i></i>
                      <i></i>
                      <i></i>
                      <i></i>
                      <i></i>
                      <i></i>
                      <i></i>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card reveal">
                <span className="tag">Command palette</span>
                <p>
                  Create, schedule, jump, search, reschedule. Every action has a keystroke, because a planner you have
                  to click through is a planner you stop opening.
                </p>
                <div className="mock">
                  <div className="mk">
                    <div className="mk-bar">
                      <i></i>
                      <i></i>
                      <i></i>
                      <b>⌘K</b>
                    </div>
                    <div className="mk-pal">
                      <div className="mk-inp">
                        Schedule<kbd>⌘K</kbd>
                      </div>
                      <div className="mk-row on">
                        <s></s>Auto-schedule this week<em>enter</em>
                      </div>
                      <div className="mk-row">
                        <s></s>Move Ship pricing page<em>⌘M</em>
                      </div>
                      <div className="mk-row">
                        <s></s>Start focus<em>⌘F</em>
                      </div>
                      <div className="mk-row">
                        <s></s>New task from email<em>⌘E</em>
                      </div>
                      <div className="mk-row">
                        <s></s>Jump to Today<em>⌘1</em>
                      </div>
                      <div className="mk-row">
                        <s></s>Open moodboard<em>⌘B</em>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ PRICING ============ */}
        <section className="pricing" id="pricing">
          <div className="wrap">
            <div className="price-head">
              <div>
                <p className="eyebrow reveal" style={{ marginBottom: "16px" }}>
                  Pricing
                </p>
                <h2 className="reveal">Cheaper than the hour it saves.</h2>
              </div>
              <p className="price-note reveal">
                One boundary, not three. Free is a real product you can stay on. Pro removes the limits.
              </p>
            </div>

            <div className="tablewrap reveal">
              <table className="cmp">
                <colgroup>
                  <col className="c-feat" />
                  <col className="c-free" />
                  <col className="c-pro" />
                </colgroup>
                <thead>
                  <tr>
                    <th></th>
                    <th className="plan-h">
                      <span className="nm">Free</span>
                      <span className="amt">$0</span>
                      <span className="per">forever</span>
                    </th>
                    <th className="plan-h pro">
                      <span className="nm">Pro</span>
                      <span className="amt">$6</span>
                      <span className="per">per month · $60 a year</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="feat-name">
                      Calendars connected<small>Google, Outlook, CalDAV</small>
                    </td>
                    <td className="val">One</td>
                    <td className="val yes pro">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="feat-name">
                      Auto-scheduled tasks<small>Placed around your real week</small>
                    </td>
                    <td className="val">15 a month</td>
                    <td className="val yes pro">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="feat-name">
                      Reschedule preview<small>See the day before you keep it</small>
                    </td>
                    <td className="val yes">Included</td>
                    <td className="val yes pro">Included</td>
                  </tr>
                  <tr>
                    <td className="feat-name">
                      Boards<small>Columns, drag and drop, saved views</small>
                    </td>
                    <td className="val">One</td>
                    <td className="val yes pro">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="feat-name">
                      Pages<small>Documents in the same workspace</small>
                    </td>
                    <td className="val">Three</td>
                    <td className="val yes pro">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="feat-name">
                      Real-time collaboration<small>Two people in one document</small>
                    </td>
                    <td className="val no">—</td>
                    <td className="val yes pro">Included</td>
                  </tr>
                  <tr>
                    <td className="feat-name">
                      Moodboards<small>Infinite Excalidraw canvas</small>
                    </td>
                    <td className="val no">—</td>
                    <td className="val yes pro">Included</td>
                  </tr>
                  <tr>
                    <td className="feat-name">
                      Focus timer<small>Sessions against real blocks</small>
                    </td>
                    <td className="val yes">Included</td>
                    <td className="val yes pro">Included</td>
                  </tr>
                  <tr>
                    <td className="feat-name">
                      Focus stats<small>Time spent, week by week</small>
                    </td>
                    <td className="val no">—</td>
                    <td className="val yes pro">Included</td>
                  </tr>
                  <tr>
                    <td className="feat-name">
                      The agent<small>22 tools on your real data</small>
                    </td>
                    <td className="val">Limited</td>
                    <td className="val yes pro">Full</td>
                  </tr>
                  <tr>
                    <td className="feat-name">
                      Agent memory<small>It keeps your corrections</small>
                    </td>
                    <td className="val no">—</td>
                    <td className="val yes pro">Included</td>
                  </tr>
                  <tr>
                    <td className="feat-name">
                      Bring your own model<small>Anthropic, OpenAI, Grok, GLM, custom</small>
                    </td>
                    <td className="val no">—</td>
                    <td className="val yes pro">Included</td>
                  </tr>
                  <tr>
                    <td className="feat-name">
                      Inbox → task<small>Read-only mail, never sends</small>
                    </td>
                    <td className="val no">—</td>
                    <td className="val yes pro">Included</td>
                  </tr>
                  <tr>
                    <td className="feat-name">
                      Command palette<small>⌘K on every action</small>
                    </td>
                    <td className="val yes">Included</td>
                    <td className="val yes pro">Included</td>
                  </tr>
                  <tr>
                    <td className="feat-name">
                      MCP server<small>Point your own agent at Needt</small>
                    </td>
                    <td className="val no">
                      <span className="soon">planned</span>
                    </td>
                    <td className="val pro">
                      <span className="soon">planned</span>
                    </td>
                  </tr>
                  <tr className="cta-row">
                    <td></td>
                    <td>
                      <a className="btn btn-ghost" href="https://use.needt.app">
                        Start my free plan
                      </a>
                    </td>
                    <td className="pro">
                      <a className="btn btn-solid" href="https://use.needt.app">
                        Start my trial
                      </a>
                      <small
                        style={{
                          display: "block",
                          marginTop: "9px",
                          font: "400 12px/1.4 var(--f-mono)",
                          color: "rgba(0,0,0,.55)",
                        }}
                      >
                        14 days · no card
                      </small>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="lifetime reveal">
              <span className="lt-amt">
                $79<span className="was">$149</span>
              </span>
              <div className="lt-body">
                <strong>Lifetime — first 100 people</strong>
                <span>
                  Everything in Pro, permanently, for one payment. Not a different product — the same one on a different
                  payment schedule.
                </span>
              </div>
              <a className="btn btn-ghost" href="https://use.needt.app">
                Buy once
              </a>
            </div>
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <section className="faq" id="faq">
          <div className="wrap">
            <h2 className="reveal">Reasonable questions.</h2>

            <details className="qa reveal">
              <summary>Does it move things without asking?</summary>
              <p>
                No. Every reschedule is shown as a proposal first — what moved, where it went, what stayed put. You keep
                it or you undo it. The same rule applies to the agent: anything that edits, deletes or changes your
                working hours requires confirmation.
              </p>
            </details>

            <details className="qa reveal">
              <summary>Can the agent send email as me?</summary>
              <p>
                It cannot. Mail access is read-only by design — it can search your locally synced messages, open one,
                and turn it into a task. There is no tool in the catalogue that sends anything.
              </p>
            </details>

            <details className="qa reveal">
              <summary>Do I have to use your AI?</summary>
              <p>
                No. Needt works as a planner with the agent switched off. If you do want it, you can use the hosted
                model or point Needt at your own Anthropic, OpenAI, Grok, GLM or custom endpoint — your key, your bill,
                your data going where you chose.
              </p>
            </details>

            <details className="qa reveal">
              <summary>What happens to my calendar?</summary>
              <p>
                Needt syncs it into its own database and works on that copy, so the app stays fast and keeps working
                when a provider is slow. Events you did not create in Needt are never rewritten — they are the fixed
                points the rest of the day is arranged around.
              </p>
            </details>

            <details className="qa reveal">
              <summary>Why is there no free trial on Free?</summary>
              <p>
                Because Free is not a trial. One calendar, fifteen auto-scheduled tasks a month, a board and the focus
                timer, with no expiry. Pro is for when the limits start to hurt, and it has a fourteen-day trial without
                a card.
              </p>
            </details>

            <details className="qa reveal">
              <summary>Is my data used to train anything?</summary>
              <p>
                No. Your schedule, pages and mail are yours. When you bring your own model key, requests go straight to
                that provider under your account and their terms.
              </p>
            </details>
          </div>
        </section>

        {/* ============ WHO IS BEHIND IT ============ */}
        <section className="founder" id="who">
          <div className="wrap">
            <p className="eyebrow reveal" style={{ marginBottom: "24px" }}>
              Who is behind it
            </p>
            <div className="founder-card reveal">
              <div className="avatar">M</div>
              <div>
                <p>
                  Needt is built by <strong>one person</strong>. I made it because every planner I tried asked me to
                  maintain it — to re-sort the list when a meeting landed, to decide again what fits before lunch. That
                  is the work I wanted the tool to do.
                </p>
                <p>
                  It is early. Some of it is rough, the roadmap is public, and if you write to me you get me, not a
                  ticket queue. That is the trade: you are not buying a finished thing from a company, you are getting an
                  unfinished one from someone who uses it every day and answers.
                </p>
                <div className="sig">
                  <span>Maksym · Switzerland</span>
                  <a href="mailto:hello@needt.app">hello@needt.app</a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="sticky-cta" id="stickycta">
        <a href="https://use.needt.app">
          Start my free plan <span>no card</span>
        </a>
      </div>

      <footer>
        <div className="wrap">
          <div className="fcta">
            <p className="display reveal">Ready for a better day?</p>
            <a className="btn btn-solid btn-lg reveal" href="https://use.needt.app">
              Start my free plan
            </a>
            <p className="fine reveal">
              Free while it is in beta. Works on any browser, and with the calendar you already have.
            </p>
          </div>

          <div className="fcols reveal">
            <div className="fcol">
              <h5>Product</h5>
              <a href="#how">How it works</a>
              <a href="#agent">The agent</a>
              <a href="#inside">Inside</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div className="fcol">
              <h5>Connect</h5>
              <span>Google Calendar</span>
              <span>Outlook</span>
              <span>CalDAV</span>
              <span>MCP · soon</span>
            </div>
            <div className="fcol">
              <h5>Company</h5>
              <a href="#who">Who is behind it</a>
              <a href="#faq">FAQ</a>
              <a href="mailto:hello@needt.app">Contact</a>
            </div>
            <div className="fcol">
              <h5>Legal</h5>
              <a href="https://use.needt.app/privacy">Privacy</a>
              <a href="https://use.needt.app/terms">Terms</a>
              <a href="https://use.needt.app">Sign in</a>
            </div>
          </div>

          <div className="fbot">
            <span>Copyright © 2026</span>
            <span className="built">
              Designed and built by one person
              <br />
              in Switzerland
            </span>
            <span>Needt</span>
          </div>
        </div>
        <div className="bloom" aria-hidden="true"></div>
      </footer>
    </>
  )
}
