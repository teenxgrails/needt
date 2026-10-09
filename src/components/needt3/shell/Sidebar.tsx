"use client";

import { useState } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  FiChevronDown,
  FiCloud,
  FiFileText,
  FiFolder,
  FiPlus,
} from "react-icons/fi";

import { formatInTimeZone, newDate } from "@/lib/date-utils";
import { useConnections } from "@/lib/needt3/hooks/connections";
import { useCreateDoc, useDocs } from "@/lib/needt3/hooks/docs";
import { useProjects } from "@/lib/needt3/hooks/projects";
import { useSettings, useTimeZone } from "@/lib/needt3/hooks/settings";
import { useTasks } from "@/lib/needt3/hooks/tasks";

import { useNeedt3Ui } from "@/store/needt3-ui";

import { RichMenu } from "../menu/RichMenu";
import { AccountMenu } from "./AccountMenu";
import { CustomizeSidebar } from "./CustomizeSidebar";
import { PlaceGlyph } from "./PlaceGlyph";
import { MoreIcon, SHELL_PLACES, sidebarTiles } from "./places";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const settings = useSettings();
  const projects = useProjects();
  const docs = useDocs();
  const createDoc = useCreateDoc();
  const tasks = useTasks();
  const connections = useConnections();
  const timeZone = useTimeZone();
  const today = formatInTimeZone(newDate(), timeZone, "yyyy-MM-dd");
  const todayTasks =
    tasks.data?.filter((task) => !task.noSlot && task.dueDate === today) ?? [];
  const overdue =
    tasks.data?.filter(
      (task) =>
        !task.done && !task.noSlot && !!task.dueDate && task.dueDate < today
    ).length ?? 0;
  const issues =
    connections.data?.filter(
      (connection) =>
        connection.state === "error" || connection.state === "disconnected"
    ) ?? [];
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const setComposerOpen = useNeedt3Ui((state) => state.setComposerOpen);
  const prefs = settings.data?.prefs;
  const tiles = sidebarTiles(prefs?.sidebarTiles);
  const rest = SHELL_PLACES.filter((place) => !tiles.includes(place));

  return (
    <aside className="shell-sidebar-stack" aria-label="Places">
      <div className="shell-sidebar-row">
        <AccountMenu />
      </div>
      <div className="scroll-inner shell-sidebar-scroll-inner">
        <div className="shell-sidebar-grid">
          {tiles.map((place) => (
            <Link
              className="sb-place sb-place-box"
              href={place.href}
              key={place.id}
              aria-label={place.label}
              aria-current={
                pathname === place.href || pathname.startsWith(`${place.href}/`)
                  ? "page"
                  : undefined
              }
            >
              <PlaceGlyph id={place.id} />
              <span className="sb-place-label">
                {place.id === "moodboards" ? "Boards" : place.label}
              </span>
              {place.id === "today" && todayTasks.length > 0 && (
                <span className="sb-count" title="Tasks due today">
                  <span className="sb-count-label">
                    {todayTasks.filter((task) => task.done).length}/
                    {todayTasks.length}
                  </span>
                </span>
              )}
              {place.id === "tasks" && overdue > 0 && (
                <span
                  className="sb-badge shell-place-tile-badge"
                  title={`${overdue} overdue tasks`}
                  style={{
                    background: "var(--fill-destructive)",
                    color: "var(--destructive)",
                  }}
                >
                  {overdue}
                </span>
              )}
            </Link>
          ))}
          <RichMenu
            trigger={
              <button
                className={`sb-place sb-place-box${tiles.length && tiles.length % 3 === 0 ? " is-wide" : ""}`}
                aria-label="More places"
              >
                <MoreIcon size={24} />
                <span className="sb-place-label">More</span>
              </button>
            }
            items={[
              ...rest.map((place) => ({
                title: place.label,
                icon: <place.icon size={16} />,
                onClick: () => router.push(place.href),
              })),
              { sep: true },
              {
                title: "Customize Sidebar",
                onClick: () => setCustomizeOpen(true),
              },
            ]}
          />
        </div>
        <Link className="sb-row" href="/connections">
          <FiCloud size={16} />
          Connections
          {issues.length > 0 && (
            <span
              className="shell-sidebar-sb-conn-issue"
              title={issues.map((connection) => connection.label).join(", ")}
            >
              {issues.length} {issues.length === 1 ? "issue" : "issues"}
            </span>
          )}
        </Link>
        {(
          [
            { id: "pinned", label: "Pinned" },
            { id: "projects", label: "Projects" },
          ] as const
        ).map((section) => (
          <section className="base-stack" key={section.id}>
            <button
              className="sb-head"
              style={{
                border: 0,
                background: "transparent",
                textAlign: "left",
              }}
              aria-expanded={!collapsed[section.id]}
              onClick={() =>
                setCollapsed((previous) => ({
                  ...previous,
                  [section.id]: !previous[section.id],
                }))
              }
            >
              <span className="sb-head-title">{section.label}</span>
              <FiChevronDown
                size={15}
                style={{
                  transform: collapsed[section.id]
                    ? "rotate(-90deg)"
                    : undefined,
                }}
              />
            </button>
            {!collapsed[section.id] &&
              (section.id === "pinned"
                ? docs.data
                    ?.filter((doc) => doc.isFavorite)
                    .map((doc) => (
                      <Link
                        className="sb-row"
                        href={`/pages/${encodeURIComponent(doc.id)}`}
                        key={doc.id}
                      >
                        <FiFileText size={16} />
                        {doc.title || "Untitled"}
                      </Link>
                    ))
                : projects.data?.map((project) => (
                    <Link
                      className="sb-row"
                      href={`/projects/${encodeURIComponent(project.id)}`}
                      key={project.id}
                    >
                      <FiFolder
                        size={16}
                        style={{ color: project.color ?? undefined }}
                      />
                      {project.name}
                    </Link>
                  )))}
          </section>
        ))}
      </div>
      <div className="shell-sidebar-stack-2">
        <div className="sb-foot shell-sidebar-foot">
          <Link className="nx-btn nx-btn-text" href="/focus">
            Focus
          </Link>
          <RichMenu
            up
            trigger={
              <button className="nx-btn nx-btn-secondary sb-create">
                <FiPlus size={16} />
                Create
              </button>
            }
            items={[
              {
                title: "New task",
                kbd: "N",
                onClick: () => setComposerOpen(true),
              },
              {
                title: "New doc",
                disabled: createDoc.isPending,
                onClick: () => {
                  void createDoc
                    .mutateAsync({ draft: { title: "" } })
                    .then(({ result }) => {
                      if (result)
                        router.push(`/pages/${encodeURIComponent(result.id)}`);
                    })
                    .catch(() => {});
                },
              },
            ]}
          />
        </div>
      </div>
      <CustomizeSidebar
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
      />
    </aside>
  );
}
