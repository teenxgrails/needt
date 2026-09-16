"use client";

/* THE QUEUE, AS A SHEET — the desktop rail's queue, pulled up on a phone.
 *
 * Ported from `Mobile.jsx`'s `MbQueue`. Placing a task is a deliberate act on
 * this shell, not something permanently docked on screen, so the queue is a
 * reach rather than a rail — see the header button that opens this in
 * `MobileHeader`.
 */
import * as React from "react";

import type { NeedtTask } from "@/lib/needt/types";

import { RichBlock } from "../RichBlock";
import { rbShape } from "../rb-shape";
import { MobileSheet } from "./MobileSheet";
import {
  mobileDuration,
  mobileQueue,
  mobileQueueMinutes,
} from "./mobile-logic";

export interface MobileQueueSheetProps {
  tasks: readonly NeedtTask[];
  open: boolean;
  onClose: () => void;
  onOpenTask: (task: NeedtTask) => void;
  onToggleTask: (id: string) => void;
}

export function MobileQueueSheet({
  tasks,
  open,
  onClose,
  onOpenTask,
  onToggleTask,
}: MobileQueueSheetProps) {
  const queue = React.useMemo(() => mobileQueue(tasks), [tasks]);
  const minutes = React.useMemo(() => mobileQueueMinutes(tasks), [tasks]);

  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title="Unplaced"
      count={queue.length}
      meta={minutes ? `${mobileDuration(minutes)} waiting` : undefined}
    >
      {queue.map((task) => (
        <RichBlock
          touch
          key={task.id}
          block={rbShape(task, { layout: "card" })}
          weight="open"
          fit
          onOpen={() => onOpenTask(task)}
          onToggle={() => onToggleTask(task.id)}
        />
      ))}
    </MobileSheet>
  );
}
