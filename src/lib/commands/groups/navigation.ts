import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import {
  HiOutlineCalendar,
  HiOutlineChatAlt2,
  HiOutlineClipboardList,
  HiOutlineCog,
  HiOutlineFolder,
  HiOutlineLightningBolt,
  HiOutlineMail,
} from "react-icons/hi";

import { Command } from "../types";

export function useNavigationCommands(): Command[] {
  return [
    {
      id: "navigation.calendar",
      title: "Go to Calendar",
      keywords: ["navigation"],
      icon: HiOutlineCalendar,
      section: "navigation",
      shortcut: "gc",
      perform: (router?: AppRouterInstance) => {
        if (router) router.push("/calendar");
      },
    },
    {
      id: "navigation.tasks",
      title: "Go to Tasks",
      keywords: ["navigation"],
      icon: HiOutlineClipboardList,
      section: "navigation",
      shortcut: "gt",
      perform: (router?: AppRouterInstance) => {
        if (router) router.push("/tasks");
      },
    },
    {
      id: "navigation.projects",
      title: "Go to Projects",
      keywords: ["navigation", "projects", "stages", "kanban"],
      icon: HiOutlineFolder,
      section: "navigation",
      shortcut: "gp",
      perform: (router?: AppRouterInstance) => {
        if (router) router.push("/projects");
      },
    },
    {
      id: "navigation.focus",
      title: "Go to Focus",
      keywords: ["navigation"],
      icon: HiOutlineLightningBolt,
      section: "navigation",
      shortcut: "gf",
      perform: (router?: AppRouterInstance) => {
        if (router) router.push("/focus");
      },
    },
    {
      id: "navigation.chat",
      title: "Go to AI Chat",
      keywords: ["navigation", "ai", "chat"],
      icon: HiOutlineChatAlt2,
      section: "navigation",
      shortcut: "ga",
      perform: (router?: AppRouterInstance) => {
        if (router) router.push("/chat");
      },
    },
    {
      id: "navigation.mail",
      title: "Go to Mail",
      keywords: ["navigation", "inbox", "email"],
      icon: HiOutlineMail,
      section: "navigation",
      shortcut: "gm",
      perform: (router?: AppRouterInstance) => {
        if (router) router.push("/mail");
      },
    },
    {
      id: "navigation.settings",
      title: "Go to Settings",
      keywords: ["navigation"],
      icon: HiOutlineCog,
      section: "navigation",
      shortcut: "gs",
      perform: (router?: AppRouterInstance) => {
        if (router) router.push("/settings");
      },
    },
  ];
}
