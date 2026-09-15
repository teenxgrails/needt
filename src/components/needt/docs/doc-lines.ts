/* A DOCUMENT'S OWN TEXT, IN MINIATURE — the shape a card draws instead of a
 * coloured swatch.
 *
 * PORT.md §3: "Documents ... a pinned grid plus a list, each card a
 * miniature of its own text." A card that names a document but draws the
 * same line-bar rhythm as every other card is a coloured swatch with a
 * caption; this derives the rhythm from the document's own title, so two
 * documents never draw the same page by coincidence and the same document
 * always draws the same page.
 *
 * No `Math.random` — the seed is the title itself, folded into one integer,
 * so the function is pure and provable without a DOM.
 */

/** A small, deterministic string hash (djb2-ish). Good enough for a visual
 *  seed; not a cryptographic hash. */
function seedFrom(text: string): number {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) {
    h = (h * 33 + text.charCodeAt(i)) >>> 0;
  }
  return h || 1;
}

/** One page of "text": a run of line widths (0–100, percent of the sheet's
 *  width) derived from `seed` (a document's title, usually). The last line
 *  of the run always falls short, the way a paragraph's last line does;
 *  interior lines mostly run near full width with an occasional short one,
 *  so the page reads as prose rather than a bar chart. */
export function docLineWidths(seed: string, lines: number): readonly number[] {
  const base = seedFrom(seed);
  const widths: number[] = [];
  for (let i = 0; i < lines; i += 1) {
    const isLast = i === lines - 1;
    const step = (base + i * 2654435761) >>> 0;
    if (isLast) {
      widths.push(38 + (step % 30));
      continue;
    }
    const short = step % 5 === 0;
    widths.push(short ? 54 + (step % 22) : 90 + (step % 10));
  }
  return widths.map((w) => Math.min(100, w));
}
