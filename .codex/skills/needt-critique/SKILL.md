---
name: needt-critique
description: Adversarial, evidence-backed review of Needt plans, diffs, APIs, UI proposals, and release readiness. Use before risky or multi-step changes.
---

# Needt Critique

This is the project-scoped Needt adaptation of
[`dlowd/claude-skill-critique`](https://github.com/dlowd/claude-skill-critique),
licensed MIT. The upstream source files remain in this directory.

## Safety contract

- Review only: do not edit code, create archives, change Git state, contact
  external services, or launch nested agents while this skill is active.
- Never bypass the sandbox or relay raw diagnostic dumps.
- Ground every finding in a file, line, command result, screenshot, or
  reproducible scenario. Do not manufacture findings.
- Read `critique_prompt.md` before reviewing. It provides the adversarial
  reviewer lens; these project rules override its Claude-specific orchestration.

## Procedure

1. Resolve the target explicitly from the user request or current plan. If it
   is ambiguous, ask which file, diff, or milestone to review.
2. Read `AGENTS.md`, the governing plan/spec, relevant code paths, focused
   tests, and the current Git diff or commit range.
3. Audit security, tenancy/privacy, data recovery, migrations, offline/replay,
   realtime authorization, UI/accessibility, release/rollback, and tests in
   proportion to the target's risk.
4. Report only evidence-backed findings, ordered as: Showstopper, Gap,
   Inconsistency, Underspecified, Suggestion. Include a brief “What looks
   good” section.
5. Triage every finding as `worth fixing`, `judgment call`, or `wrong` after
   independently verifying it. State the concrete next action and any
   unverified gate.

For a plan review, reject dependency gaps, hidden product decisions, unclear
ownership, untestable acceptance criteria, and absent rollback paths. For a
diff/release review, distinguish verified checks from checks not run.
