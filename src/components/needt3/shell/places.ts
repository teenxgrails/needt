import type { IconType } from "react-icons";
import {
  FiCalendar,
  FiCheckSquare,
  FiFileText,
  FiFolder,
  FiGrid,
  FiHome,
  FiMail,
  FiMoreHorizontal,
  FiRepeat,
  FiShare2,
  FiTrash2,
} from "react-icons/fi";

export interface ShellPlace {
  id: string;
  label: string;
  href: string;
  icon: IconType;
}

export const SHELL_PLACES: readonly ShellPlace[] = [
  { id: "today", label: "Home", href: "/today", icon: FiHome },
  { id: "calendar", label: "Calendar", href: "/calendar", icon: FiCalendar },
  { id: "tasks", label: "Tasks", href: "/tasks", icon: FiCheckSquare },
  { id: "docs", label: "Docs", href: "/pages", icon: FiFileText },
  { id: "mail", label: "Mailbox", href: "/mail", icon: FiMail },
  { id: "projects", label: "Projects", href: "/projects", icon: FiFolder },
  { id: "moodboards", label: "Moodboards", href: "/moodboards", icon: FiGrid },
  { id: "habits", label: "Habits", href: "/habits", icon: FiRepeat },
  { id: "templates", label: "Templates", href: "/templates", icon: FiFileText },
  { id: "shared", label: "Shared", href: "/shared", icon: FiShare2 },
  { id: "trash", label: "Trash", href: "/trash", icon: FiTrash2 },
];

export const MoreIcon = FiMoreHorizontal;

/** Existing saved tile orders are preserved; unknown places never become routes. */
export function sidebarTiles(saved: unknown) {
  if (!Array.isArray(saved)) return SHELL_PLACES.slice(0, 5);
  return saved
    .flatMap((entry) => {
      if (typeof entry !== "string") return [];
      const place = SHELL_PLACES.find((candidate) => candidate.id === entry);
      return place ? [place] : [];
    })
    .filter(
      (place, index, all) =>
        all.findIndex((item) => item.id === place.id) === index
    );
}
