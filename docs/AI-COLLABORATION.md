# AI collaboration and handoff

This protocol preserves operational context when multiple people and AI agents
work on Needt. Git remains the source of truth for code; handoffs explain the
state between commits; Mulch, when available, stores reusable knowledge.

## Start or resume

1. Run `npm run agent:context` before planning or editing.
2. Read `AGENTS.md`, the matching active handoff, and the governing plan/spec.
3. Run `git status --short`. Unfamiliar changes belong to another user.
4. If starting a workstream, create a unique handoff from
   `.agents/handoffs/_TEMPLATE.md` and set its branch and owner.
5. Before editing a listed file, check active handoffs for overlapping paths.

`npm run agent:context -- --json` provides the same snapshot for automation.
It is read-only and scans handoffs from every local worktree registered with
the repository.

## Isolation and ownership

- One person or agent owns a worktree at a time. Use a separate branch and Git
  worktree for each concurrent workstream.
- Do not create a second writer in the repository's primary checkout. Readers
  may inspect it without changing files or Git state.
- Do not edit another active handoff. If ownership changes, the current owner
  records the transfer and the new owner updates the same workstream afterward.
- A handoff's `Working state` lists files with uncommitted or expected edits.
  Overlap requires coordination before either side writes.
- Stage explicit paths. Never use a broad add, stash, clean, reset, or checkout
  to work around files you do not own.

Example isolated worktree (adjust the branch prefix to the active agent's
required convention):

```bash
git worktree add ../Needt-worktrees/<workstream> -b codex/<workstream>
```

## Checkpoint rules

Update the workstream handoff:

- after each completed unit and commit;
- before a migration, destructive command, deploy, or other risky boundary;
- immediately when blocked or when scope/ownership changes;
- before ending, pausing, or transferring a session.

Keep it concise and factual. Include commit SHAs, files still dirty, commands
that actually ran, unverified gates, durable decisions, blockers, and one exact
next action. Do not paste chat transcripts or raw command output.

Set `status` to `complete` only after the objective is done and required gates
have passed. Keep completed handoffs as history; a later maintenance change may
archive them after confirming no active work references them.

## Validation and knowledge

Run `npm run check:agent-handoffs` before committing a handoff. The validator
checks required metadata, timestamps, status values, and section headings.

Handoffs are operational and short-lived. Reusable conventions, failures, and
decisions belong in Mulch when `mulch` is installed and domains are configured.
Neither location may contain secrets, credentials, tokens, personal data, or
raw production logs.
