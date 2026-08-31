One-line: the sidebar nav row — 10px radius, 18px glyph, 12px gap; the active state is a filled `--surface-2` block, never a left border or accent bar.

```jsx
<NavItem label="Tasks" icon="check-square" active />
<NavItem label="Docs" icon="file" onClick={go} />
```

Rows stack in a 2px-gap column. Rest text `--text-2` with a `--text-muted` glyph; hover fills `--surface-hover` and promotes both to `--text`.
