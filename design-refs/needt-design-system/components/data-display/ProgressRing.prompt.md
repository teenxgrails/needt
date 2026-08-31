One-line: 15px progress ring shown next to a percentage in a task card's footer; it is the only chart-like element in the product.

```jsx
<span style={{ display: "flex", alignItems: "center", gap: 4 }}>
  <ProgressRing value={50} /> 50%
</span>
```

Track is `--border-strong`; the arc is `--text-2` in flight and `--dot-done` at 100%. Starts at 12 o'clock (the SVG is rotated −90°) and the arc has round caps.
