"use client";

/* THE MARK — the one perpetual animation in the product, and it means
 * something: the app is running.
 *
 * The kit ships two wordmarks. `ExposureWordmark.jsx` drives a variable font's
 * EXPO axis from a rAF engine, and needs the Exposure trial face, which is not
 * vendored here. `.needt-mark` is the other one, and the whole of its motion is
 * already in `needt-motion.css` — `needt-breathe` on the tspans,
 * `needt-lean` on the text, the hover pause, the held thin and the release
 * puff. It needs no font beyond the display token, so it is what the shell
 * wears until the Exposure engine is ported.
 *
 * The motion sheet's selectors are `.needt-mark text` and `.needt-mark tspan`,
 * so the mark HAS to be SVG text split per letter — a div with a word in it
 * matches nothing. `needt-breathe` animates `stroke-width`, which is why: the
 * mark inflates by WEIGHT in a box that does not change size, and
 * `-webkit-text-stroke-width` does not interpolate while SVG `stroke-width`
 * does.
 *
 * It STOPS during a focus session. One thing holding still while everything
 * else breathes is what reads as attention.
 */
import * as React from "react";

const LETTERS = ["N", "e", "e", "d", "t"] as const;

/* The glyphs are set at 100 units inside the viewBox, which is the size every
   number in `needt-breathe` was written against. The box is padded because the
   breath widens the word: letter-spacing travels from -2 to -0.2 across five
   letters, and a fat stroke sits outside the glyph's own outline. */
const BOX = { w: 340, h: 130, baseline: 98 };

export interface WordmarkProps {
  /** Rendered height in px. The box is fixed; only the scale changes. */
  size?: number;
  /** A session is running, so the mark holds still. */
  still?: boolean;
  /** Each letter a beat behind the one before it, so the swell travels. */
  wave?: boolean;
  title?: string;
}

export function Wordmark({
  size = 46,
  still = false,
  wave = true,
  title = "Needt",
}: WordmarkProps) {
  const [held, setHeld] = React.useState(false);
  const [puffed, setPuffed] = React.useState(false);

  React.useEffect(() => {
    if (!puffed) return undefined;
    const id = window.setTimeout(() => setPuffed(false), 440);
    return () => window.clearTimeout(id);
  }, [puffed]);

  const classes = ["needt-mark"];
  if (wave) classes.push("mode-wave");
  if (!still) classes.push("is-breathing");
  if (held) classes.push("is-held");
  if (puffed) classes.push("is-puffed");

  return (
    <svg
      className={classes.join(" ")}
      viewBox={`0 0 ${BOX.w} ${BOX.h}`}
      height={size}
      width={(size * BOX.w) / BOX.h}
      role="img"
      aria-label={title}
      style={{
        display: "block",
        overflow: "visible",
        color: "var(--text-primary)",
      }}
      onPointerDown={() => setHeld(true)}
      onPointerUp={() => {
        setHeld(false);
        setPuffed(true);
      }}
      onPointerLeave={() => setHeld(false)}
    >
      <text
        x={BOX.w / 2}
        y={BOX.baseline}
        textAnchor="middle"
        fontSize={100}
        fontFamily="var(--font-display)"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={0.2}
        paintOrder="stroke"
      >
        {LETTERS.map((letter, index) => (
          /* The letters are fixed and positional; there is no other key. */
          <tspan key={index}>{letter}</tspan>
        ))}
      </text>
    </svg>
  );
}
