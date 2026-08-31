One-line: the pill-radius search field from the sidebar; reuse its shell (16px radius, hairline border, `--surface` fill, leading 15px glyph) for any text input, since the product defines no other input.

```jsx
<SearchInput value={q} onChange={(e) => setQ(e.target.value)} />
```

13px text, `--text-muted` placeholder, no focus ring on the field itself (the border is the affordance) — `--ring` is reserved for keyboard focus on buttons.
