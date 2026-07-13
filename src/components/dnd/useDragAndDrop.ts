import { useDraggable, useDroppable } from "@dnd-kit/core";

import { Project } from "@/types/project";
import { Task } from "@/types/task";

export function useDraggableTask(task: Task) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: {
      type: "task",
      task,
    },
  });

  return {
    draggableProps: {
      ...attributes,
      ...listeners,
      ref: setNodeRef,
    },
    isDragging,
  };
}

export function useDroppableProject(project?: Project | null) {
  const id = project?.id ?? "remove-project";
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: "project",
      project,
    },
  });

  return {
    droppableProps: {
      ref: setNodeRef,
    },
    isOver,
  };
}
