---
name: handoff-project-work
description: Preserve and recover Needt workstream state across people, AI sessions, branches, and Git worktrees. Use when starting or resuming project work, pausing or transferring a task, checking concurrent ownership, or recording a durable checkpoint before a risky operation or session end.
---

# Handoff Project Work

Use Needt's tracked per-workstream handoffs to recover operational state without
guessing from chat history. This skill coordinates work; it does not replace
Git, the governing plan, or project quality gates.

## Start or resume

1. Run `npm run agent:context` from the repository root.
2. Read `AGENTS.md`, `docs/AI-COLLABORATION.md`, the governing plan/spec, and
   the active handoff matching the current branch.
3. Run `git status --short`. Preserve every unfamiliar change.
4. Confirm no active handoff claims the same files. If it does, coordinate or
   select disjoint work before editing.
5. For a new workstream, copy `.agents/handoffs/_TEMPLATE.md` to a unique
   `<YYYYMMDD>-<actor>-<slug>.md` file and fill every field.

## Work safely

- Keep one writer per worktree and one branch per concurrent workstream.
- Never edit another active handoff without an explicit ownership transfer.
- Stage explicit owned paths only. Never stash, reset, clean, revert, or remove
  unfamiliar state to make a checkout appear clean.
- Update `Working state` before editing a file when ownership would otherwise
  be ambiguous.
- Record facts and commands that ran, not intended or assumed results.

## Checkpoint or transfer

Update the handoff after a completed unit, before a risky boundary, when
blocked, and before pausing or ending the session:

1. Set `updated` to UTC `YYYY-MM-DDTHH:mm:ssZ`.
2. Record completed commit SHAs and decisions that constrain later work.
3. List dirty or expected files and explicitly protected foreign changes.
4. Separate verified commands from gates not run.
5. Record blockers and one exact next action.
6. Set `status` to `blocked` only for a real blocker and `complete` only when the
   objective and required gates are done.
7. Run `npm run check:agent-handoffs` and commit the handoff with the scoped
   change or checkpoint.

Never store credentials, tokens, personal data, production logs, or chat
transcripts. Put reusable project knowledge in Mulch only when its CLI and
domains are available; keep task progress in the handoff.
