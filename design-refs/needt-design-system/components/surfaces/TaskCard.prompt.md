One-line: the board's task card — the product's densest object and the reference for how meta rows are built.

```jsx
<TaskCard client="Stellar" title="Change top CTA button text"
  tags={[{ label: "Web", color: "blue" }, { label: "Saas", color: "amber" }]}
  assignee={{ name: "Phoenix Baker", initials: "PB" }}
  attachments={4} progress={50} comments={2} due="4d" />
```

Three stacked blocks with 12px gaps: heading pair, tag row (assignee chip pushed right), then a footer separated by a hairline top border with 13px glyphs and 11px numbers. The due chip is right-aligned via `margin-left:auto`.
