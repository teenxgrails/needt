goal: Everything below the hero on site/index.html is rebuilt in the hero's language (white ground, real-app fragments, Craft-like calm), and the old sections it replaces are gone.
done_when: index.html renders hero → new sections → footer with no old-style section left (no torn .sc scraps, no .cl clouds, no l-sky footer unless kept by decision), zero console errors, verifier passes.
out_of_scope:
  - the hero (header.hx) — approved as is
  - the ten inner pages and pricing.html
  - the app kit in needt-app/
  - new copy beyond the CLAUDE.md copy reference rules (no new numbers)
unknowns:
  - which existing sections survive (scene-unplaced, week panels, hinge line, focus, agent, instead/compare, FAQ, footer) — resolved by ask_user in step 1
  - ground below the hero: white like the hero window, or keep the light sky tint — step 1
  - footer: keep sky + giant Needt floor, or rebuild — step 1

steps:
  - id: 1
    do: ask the owner which sections stay, the ground, and the footer
    with: ask_user
    needs: []
    load: section list of site/index.html (grep of <section>)
    done_when: answers received with a choice per question
    fails_if: form dismissed — then use the recommended defaults
    reversible: yes

  - id: 2
    do: move every section marked "remove" into site/_attic/archive-film-block.html with a note
    with: run_script (cut on <section> boundaries, never inside comments)
    needs: [1]
    load: index.html, step-1 answers
    done_when: grep shows removed ids absent from index.html and present in the archive
    fails_if: orphan comment text renders on the page
    reversible: yes

  - id: 3
    do: write site/css/home.css with the section language taken from hero.css
    with: write_file
    needs: [1]
    load: site/css/hero.css tokens (ground, cards, type)
    done_when: file exists and is linked once in index.html
    fails_if: duplicated rules fighting land.css (check computed style on one card)
    reversible: yes

  - id: 4
    do: rebuild each kept section's markup on home.css classes
    with: run_script, one section per edit
    needs: [2, 3]
    load: kept section markup only
    done_when: each section renders with no .sc / .cl decoration and no legacy l-tile classes
    fails_if: text clipped or overlapping (layout validator)
    reversible: yes

  - id: 5
    do: rebuild or keep the footer per step-1 answer
    with: run_script
    needs: [1, 3]
    load: <footer> block, site/css/land.css footer rules
    done_when: footer renders, giant Needt floor still crops bottom-only if kept
    fails_if: floor letters cut at the top
    reversible: yes

  - id: 6
    do: remove now-dead CSS/JS hooks (scraps.js, sc/cl rules, unused scene jobs)
    with: grep then run_script
    needs: [4, 5]
    load: grep results for removed class names
    done_when: grep for removed classes returns 0 in index.html; no console errors
    fails_if: a remaining section loses its animation (land.js job keyed to a removed node throws)
    reversible: yes

  - id: 7
    do: verify the page
    with: ready_for_verification on site/index.html
    needs: [6]
    load: none
    done_when: verifier returns no issues
    fails_if: verifier reports defects — local repair, then re-verify
    reversible: yes

log:
  - created; step 1 in progress
  - step 1 done: keep all seven sections, white ground, decor stays, footer (sky + giant Needt) stays
  - replan: steps 2, 4, 5, 6 collapse — nothing is removed and no section is restyled beyond the ground; step 3 becomes one ground rule in land.css (body.l-white re-points --sky-tint to white)
  - step 3 done; step 7 next
