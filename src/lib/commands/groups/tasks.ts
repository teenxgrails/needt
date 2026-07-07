import { HiOutlineCheck, HiOutlineClock, HiOutlinePlus } from "react-icons/hi";

import { useFocusModeStore } from "@/store/focusMode";
import { useTaskStore } from "@/store/task";
import { useTaskModalStore } from "@/store/taskModal";

import { Command } from "../types";

export function useTaskCommands(): Command[] {
  return [
    {
      id: "tasks.create",
      title: "Create Task",
      keywords: ["task", "new", "add", "create"],
      icon: HiOutlinePlus,
      section: "tasks",
      shortcut: "nt", // 'n' for new, 't' for task
      context: {
        navigateIfNeeded: true,
        requiredPath: "/tasks",
      },
      perform: () => {
        useTaskModalStore.getState().setOpen(true);
      },
    },
    {
      id: "tasks.schedule",
      title: "Schedule Tasks",
      keywords: ["task", "schedule", "auto", "plan"],
      icon: HiOutlineClock,
      section: "tasks",
      shortcut: "st",
      perform: async () => {
        await useTaskStore.getState().scheduleAllTasks();
      },
    },
    {
      id: "tasks.complete-focus",
      title: "Complete Focus Task",
      keywords: ["task", "complete", "done", "focus"],
      icon: HiOutlineCheck,
      section: "tasks",
      shortcut: "ct",
      context: {
        requiredPath: "/focus",
        navigateIfNeeded: false,
      },
      perform: () => {
        useFocusModeStore.getState().completeCurrentTask();
      },
    },
  ];
}
