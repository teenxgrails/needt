# AI tooling setup — Needt

One-time setup so every person and every Codex profile working on this repo has
the same tools. Project-shared parts are committed here; the per-machine parts
are listed below and take about five minutes.

Everything is optional in the sense that the repo builds without it — but the
quality gates in `docs/STACK.md` stay mandatory either way. These tools reduce
mistakes and token spend; they never replace `type-check`, `lint`, tests, or CI.

---

## 0. What is already in the repo

| Path | What it is |
|---|---|
| `.codex/config.toml` | Project-scoped MCP servers: Context7 and Playwright |
| `.codex/skills/*/SKILL.md` | Seven design skills (ui-styling, design-system, brand, …) |
| `AGENTS.md` | Project instructions, including the output rules that control token spend |
| `docs/STACK.md` | Authoritative stack, quality gates, UI contracts |

Nothing below modifies application code.

---

## 1. Enable the project config (one line, once per machine)

This is **not** an access-control setting and it does not restrict anyone.
Everyone working on Needt has full access. It is Codex's own safety gate: a
cloned repository could otherwise ship a config that launches arbitrary
commands, so Codex ignores `.codex/config.toml` until the machine's owner says
this repo is trusted. There is no way to grant it from inside the repo — by
design.

Add to your user config — `~/.codex/config.toml`, or
`$CODEX_HOME/config.toml` when using a separate profile:

```toml
[projects."/Users/lol/Needt"]
trust_level = "trusted"
```

Use the real absolute path on that machine. For a guest profile:

```bash
mkdir -p "$HOME/.codex-guest"
$EDITOR "$HOME/.codex-guest/config.toml"
```

Verify after restarting Codex:

```
/mcp
```

Both `context7` and `playwright` should be listed. If they are not, see
Troubleshooting at the bottom.

**Alternative if you would rather not touch the project config at all:** copy
the two `[mcp_servers.*]` blocks from `.codex/config.toml` straight into your
user config. Same result, but each machine then maintains its own copy and they
drift apart — which is exactly what the shared file avoids.

---

## 2. Context7 — current library documentation

Already configured in `.codex/config.toml`; it runs through `npx`, so there is
nothing to install. Node 22 must be active (`nvm use` in this repo).

**Why it matters here:** the model's knowledge lags this repo. It has written
code against Next 15.3 while the project runs 15.5.22, and against older Prisma
APIs. Context7 fetches the real docs for the installed version instead.

**How to use it:** ask for the library by name in the prompt, e.g.
*"use Context7 to check the current FullCalendar `scrollTimeReset` semantics
before changing DayView"*.

---

## 3. Playwright MCP — let the agent see the UI

Also configured already. First run downloads a browser; if it fails:

```bash
npx playwright install chromium
```

**Why it matters here:** the remaining work is visual — pickers, the ambient
layer, the Focus canvas, mobile breakpoints. Without this the agent edits CSS
blind and only learns about breakage from the visual-regression suite
afterwards.

**How to use it:** run the dev server first (`npm run dev`), then ask the agent
to open a route and describe or screenshot it before and after a change. For
dense UI ask for full device-pixel screenshots — the extra pixel data measurably
improves how well the model reads small text and hit targets.

**Do not** replace the existing suites with this. `npm run test:visual` and
`npm run test:style` remain the deterministic check; Playwright MCP is the
agent's eyes, not a gate.

---

## 4. ralphex — autonomous plan execution (optional, biggest change)

Runs a plan file task by task through Codex in fresh sessions, commits after
each task, then runs multi-phase review and fixes what it finds.

```bash
brew install umputun/apps/ralphex
```

Requires Codex CLI ≥ 0.130.0 (`codex --version`).

Recommended invocation for this repo:

```bash
ralphex --codex \
  --pass-claude-md \
  --review-patience=3 \
  --max-iterations=40 \
  --idle-timeout=10m \
  docs/plans/<plan>.md
```

- `--codex` routes plan creation, tasks, review and finalize through Codex.
- `--pass-claude-md` gives it this project's `CLAUDE.md`.
- `--review-patience=3` aborts a review loop that stops making progress. This is
  the main protection against burning tokens on a stalemate.
- `--idle-timeout` kills a session that stops producing output.
- Add `--worktree` to run a plan in an isolated git worktree.

Split models to control cost — a stronger model for planning, a cheaper one for
execution:

```bash
ralphex --codex --plan-model=<strong>:high --task-model=<cheap> docs/plans/<plan>.md
```

**Rules for using it on this project**

1. **A human reviews the plan before ralphex runs it.** Plans generated in this
   project have shipped factual errors (pnpm instead of npm, "build checks
   types", "single-user") that only surfaced when checked against the code.
   Autonomy executes those errors faster; it does not catch them.
2. **Every task in the plan needs a validation command** — normally a subset of
   the gates in `docs/STACK.md`. That is what makes the loop self-correcting.
3. **Do not start an unattended run on an unreviewed plan.** Overnight runs
   multiply both good and bad outcomes.

---

## 5. Semgrep — security scanning

Deliberately a CI step rather than an agent tool: a deterministic scanner that
fails the build is worth more than an assistant that mentions a risk in prose.

```bash
brew install semgrep
```

Local run:

```bash
semgrep --config=auto --error
```

Add it to CI as a separate job next to `quality-gates`. Use
`--baseline-commit` there until the existing findings are triaged, so new
findings fail CI without blocking the initial rollout. Relevant here because the
app has public signup, a fresh rate limiter, password reset, and public booking
endpoints — all reachable without authentication.

---

## 6. Token discipline

The output rules at the top of `AGENTS.md` are the highest-leverage change; a
single rule about response shape typically matters more than any tool choice,
because output tokens cost several times more than input.

Also worth knowing:

- **Keep sessions long, not many.** Static context (system prompt + `AGENTS.md`)
  is served from cache at a fraction of normal input cost; a fresh session pays
  full price again.
- **Do not edit `AGENTS.md` mid-session** — it invalidates that cache.
- **Route models by task.** Cheap model for implementation and tests, strong
  model for planning, migrations, the scheduling engine, and ProseMirror work.
- **Third-party "token saving" gateways do not apply** to a ChatGPT-subscription
  Codex: those proxy the API, and subscription traffic does not pass through
  them. Switching to an API key to use them usually costs more, not less.

---

## Troubleshooting

**MCP servers do not appear in `/mcp`**
Check, in order: the project is marked `trust_level = "trusted"` in the *user*
config for the profile you launched; Codex was fully quit (`Cmd+Q`) and
restarted; Node 22 is active so `npx` resolves. If project-scoped MCP is not
supported in your Codex version, copy the two `[mcp_servers.*]` blocks from
`.codex/config.toml` into `~/.codex/config.toml` (or `$CODEX_HOME/config.toml`).

**Separate profile for a second person**

```bash
mkdir -p "$HOME/.codex-guest"
open -n -a Codex --env CODEX_HOME="$HOME/.codex-guest"
```

`-n` is required — without it macOS reuses the running instance and the
environment variable is ignored. Each person signs in with their own account;
never copy `auth.json` between profiles.

**`codex: command not found`**
The desktop app and the CLI are separate. Install the CLI with
`brew install codex` (preferred — independent of Node) or
`npm install -g @openai/codex`.
