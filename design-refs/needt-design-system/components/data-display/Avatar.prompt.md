One-line: circular initials avatar used for people and for the team switcher; it is always the gradient, never an image.

```jsx
<Avatar initials="PB" size={18} />
<Avatar initials="DV" size={34} />
```

The gradient is `--avatar-gradient` (135°, `--avatar-from`→`--avatar-to`) and desaturates in dark mode. Text is white at 90% opacity, semibold, auto-sized to 42% of the box.
