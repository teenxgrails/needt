# Deterministic scheduling contract

- `availableFrom`, `startDate`, and `postponedUntil` are independent lifecycle
  boundaries. A task cannot start before the latest non-null boundary.
- A soft `deadline` is a preferred completion time. Capacity may move the task
  to the nearest later valid slot.
- `hardDeadline` makes `deadline` a strict completion boundary. The scheduler
  may use otherwise free time outside the selected Work Schedule only when the
  task cannot fit inside its schedule, and no generated block may end after the
  deadline.
- `isFrozen` and `scheduleLocked` describe manual placement; neither implies a
  hard deadline.
