"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { FiSearch } from "react-icons/fi";

import { useNeedt3Ui } from "@/store/needt3-ui";

import { Sheet } from "../ctx/Sheet";
import { SHELL_PLACES } from "../shell/places";

/** Navigation commands work before domain search is integrated by S1. */
export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const setComposerOpen = useNeedt3Ui((state) => state.setComposerOpen);
  const openSettings = useNeedt3Ui((state) => state.openSettings);
  const toggleSidebar = useNeedt3Ui((state) => state.toggleSidebar);
  const commands = [
    { title: "New task", run: () => setComposerOpen(true) },
    ...SHELL_PLACES.map((place) => ({
      title: `Go to ${place.label}`,
      run: () => router.push(place.href),
    })),
    { title: "Toggle sidebar", run: toggleSidebar },
    { title: "Settings", run: () => openSettings() },
  ].filter((command) =>
    command.title.toLowerCase().includes(query.trim().toLowerCase())
  );
  const run = (index: number) => {
    commands[index]?.run();
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Open anything"
      className="shell-search-palette-search nx-sheet"
    >
      <div className="shell-search-palette-row">
        <FiSearch size={18} />
        <input
          className="shell-search-palette-search-2"
          aria-label="Search commands"
          placeholder="Search commands"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(0);
          }}
          role="combobox"
          aria-expanded={true}
          aria-controls="v3-command-results"
          aria-activedescendant={
            commands.length ? `v3-command-${selected}` : undefined
          }
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setSelected((index) =>
                commands.length
                  ? (index +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      commands.length) %
                    commands.length
                  : 0
              );
            } else if (event.key === "Enter" && commands.length) {
              event.preventDefault();
              run(selected);
            }
          }}
        />
      </div>
      <div
        id="v3-command-results"
        role="listbox"
        aria-label="Commands"
        className="shell-search-palette-div"
      >
        {commands.map((command, index) => (
          <button
            id={`v3-command-${index}`}
            key={command.title}
            role="option"
            aria-selected={index === selected}
            className="sb-acct-row"
            onPointerMove={() => setSelected(index)}
            onClick={() => run(index)}
          >
            {command.title}
          </button>
        ))}
        {!commands.length && <p className="base-meta">No commands found.</p>}
      </div>
    </Sheet>
  );
}
