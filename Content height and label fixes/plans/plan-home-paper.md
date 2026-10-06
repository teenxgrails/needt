goal: Landing (site/index.html) takes Pricing's heading type and grained paper, cut differently; night paper + dark header over the dark bands; footer re-papered.
done_when: index renders with Figtree loaded, Exposure EXPO -5 headings, torn grained sheets per section, night ground around .l-dark, nav dark over bands, footer on torn sky sheet.
out_of_scope: copy, layout, scenes, animations, inner pages.
steps:
  - id: 1  do: write css/paper.css (type, sheets, night, footer)  status: done
  - id: 2  do: write js/night.js (body.is-night toggle)  status: done
  - id: 3  do: link Figtree + paper.css + night.js in index.html  status: done
  - id: 4  do: verify render  with: ready_for_verification  status: pending
