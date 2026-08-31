One-line: the product's only icon system — 24×24 stroke glyphs at 1.6 weight that inherit `currentColor`; use it for every glyph rather than importing another icon library.

```jsx
<Icon name="filter" size={15} />
<span style={{ color: "var(--text-muted)" }}><Icon name="clock" size={13} /></span>
```

Sizes in the product: 13 for card meta rows, 14 for section-header affordances, 15 for buttons and inline breadcrumbs, 16 for the theme toggle, 18 for sidebar nav rows. Color comes from the parent (`--text-muted` at rest, `--text` when active/hovered) — pass `color` only when the glyph must break from its parent. `iconNames` enumerates the set.
