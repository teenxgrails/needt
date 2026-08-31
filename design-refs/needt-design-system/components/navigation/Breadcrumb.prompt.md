One-line: the trail above a page title — a 15px home glyph, 13px chevron separators, and the current page as a small filled chip.

```jsx
<Breadcrumb items={["Dashboard", "Overview"]} />
```

All 13px `--text-muted`; only the last segment gets the `--surface-2` chip with `--text-2` text. No text link colour anywhere in the trail.
