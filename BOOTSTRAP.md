# Needt — paste this into any new agent chat

Copy everything below into the first message of any new AI chat/session
(Codex, Claude Code, Cowork, ChatGPT, Gemini, or anything else) that will
touch this repository. Codex and Claude Code already auto-load
[`AGENTS.md`](AGENTS.md) / [`CLAUDE.md`](CLAUDE.md); paste this anyway so the
required order and the end-of-session save habit are explicit and not
skipped when a session gets long or the tool is unfamiliar with the repo.

---

You are working in the Needt repo (`/Users/lol/Needt`). Before doing
anything else, in order:

1. Run `npm run agent:context` and `git status --short`.
2. Read `AGENTS.md` in full, then `docs/AI-COLLABORATION.md`.
3. Read every file in `.agents/handoffs/` with `status: active`. If one
   matches your task or branch, resume from its `Next action` — do not
   re-derive state that's already written down there.
4. Treat every path listed under another handoff's `Working state ->
   Foreign changes that must remain untouched` as off-limits until that
   handoff is closed (`status: complete`) or its owner hands it off to you.
5. If your task will touch more than ~3 files, or the repo has no active
   handoff for it yet, create one from `.agents/handoffs/_TEMPLATE.md` before
   editing.
6. **Before you run low on context, turns, or usage limits — stop coding and
   write/update your handoff first.** Record: commits made (SHAs), files
   still dirty, what passed/failed (type-check, lint, tests, build),
   durable decisions, open blockers, and one *exact* next action. The next
   agent must be able to continue from that file alone, with zero
   re-investigation. This is the single most important step — an unsaved
   handoff at a cutoff wastes the entire next session re-discovering state.

Do not skip steps 1–4 even if the task looks small. Do not treat a green
`next build` as verification — see the Non-negotiable rules in `AGENTS.md`.
