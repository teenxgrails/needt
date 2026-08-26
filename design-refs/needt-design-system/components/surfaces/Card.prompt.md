One-line: the generic surface for any panel or card — 16px radius, 1px `--border`, `--surface` fill, 14px padding, flat at rest.

```jsx
<Card hoverable>…</Card>
```

Never give a card a resting shadow or a coloured left edge. `hoverable` is the product's only elevation event: border promotes to `--border-strong` and `--shadow-card-hover` (a barely-there 1px) appears.
