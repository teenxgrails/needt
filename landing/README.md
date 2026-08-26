# needt.app — the marketing landing

React + Vite. Ported from the single self-contained HTML page by Figma Make on
2026-08-26; that original is kept read-only at `src/imports/index.html` and is
the source of truth for anything the port got wrong.

## Why it lives here and not in Downloads

The previous version of this page, plus seventeen design prototypes, sat
untracked on disk for a month. Anything that matters is in git.

## Relationship to the rest of the repo

This is **not** part of the Next.js application. It has its own dependencies,
its own build and its own domain (`needt.app`, while the product is
`use.needt.app`). The root `AGENTS.md` and `CLAUDE.md` do not govern this
folder — but `design-refs/dia-tokens.md`, from which the whole visual system was
transcribed, does.

`FIGMA-MAKE-NOTES.md` is the scaffold guide Figma Make shipped with the export.
Kept for reference; it describes Make's own sandbox, not this repository.

## Production today

Production still serves the **static** page: `docker/landing/Dockerfile` copies
`design-refs/landing/index.html` into nginx, no build step at all. That was
deliberate — three parallel `npm ci` + `next build` runs on a four-core box took
production down on 2026-08-23, and a landing with no build cannot take part in
that failure mode.

Before this React version replaces it, the build has to move to GitHub Actions
and ship prebuilt static output into the same nginx image. Do not put a Vite
build on the production host.
