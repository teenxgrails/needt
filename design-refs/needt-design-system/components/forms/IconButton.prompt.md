One-line: glyph-only button — bordered at 34px for toolbar actions like the theme toggle, borderless for the small +/⋯ affordances on section and column headers.

```jsx
<IconButton icon="moon" label="Switch to dark theme" />
<IconButton icon="plus" bordered={false} size={22} iconSize={15} label="Add task" />
```

Always pass `label`. Bordered rest colour is `--text-2`; borderless rest is `--text-muted`. Both promote to `--text` on `--surface-hover`.
