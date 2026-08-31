One-line: the tag pill that labels a task's category on a card — use it only for categories, not for status or counts.

```jsx
<TagPill label="Web" color="blue" />
<TagPill label="Saas" color="amber" />
```

Colour mapping in the product is fixed: Web→blue, Saas→amber, Mobile→purple. Pills sit in a 6px-gap wrap row at the top of a card's meta area. 11px medium, 2.5px/9px padding, fully rounded — the padding is asymmetric on purpose, don't normalise it.
