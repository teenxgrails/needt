One-line: text button for toolbar and inline actions — the system has no solid primary button, so do not invent one.

```jsx
<Button icon="filter">Filter</Button>
<Button variant="ghost">Cancel</Button>
<Button variant="dashed" icon="plus">Add new</Button>
```

`secondary` is the default toolbar look (1px `--border`, 8px radius, transparent fill). `dashed` is the column footer's "Add new" affordance — 16px radius, full width, dashed hairline. Hover on all variants: `--surface-hover` background and text promoted to `--text`. No shadows, no scale on press.
