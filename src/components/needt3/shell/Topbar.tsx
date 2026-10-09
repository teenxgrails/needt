"use client";

import { FiHelpCircle, FiSearch, FiSidebar } from "react-icons/fi";

import { useNeedt3Ui } from "@/store/needt3-ui";

export function Topbar({
  onKeyboard,
  onSidebar,
}: {
  onKeyboard: () => void;
  onSidebar: () => void;
}) {
  const sidebarOpen = useNeedt3Ui((state) => state.sidebarOpen);
  const setPaletteOpen = useNeedt3Ui((state) => state.setPaletteOpen);
  return (
    <nav
      className="tab-bar shell-tab-bar-tab-bar"
      aria-label="Application controls"
    >
      <span className="shell-tab-bar-row">
        <button
          className="nx-btn nx-btn-text"
          aria-label="Toggle sidebar"
          aria-expanded={sidebarOpen}
          onClick={onSidebar}
        >
          <FiSidebar size={18} />
        </button>
      </span>
      <span className="shell-tab-bar-span">
        <button
          className="nx-btn nx-btn-secondary"
          style={{ width: "100%", justifyContent: "space-between" }}
          onClick={() => setPaletteOpen(true)}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FiSearch size={16} />
            Open
          </span>
          <kbd className="key-cap">⌘K</kbd>
        </button>
      </span>
      <span className="base-row shell-tab-bar-row-2">
        <button
          className="nx-btn nx-btn-text"
          aria-label="Keyboard shortcuts"
          onClick={onKeyboard}
        >
          <FiHelpCircle size={18} />
        </button>
      </span>
    </nav>
  );
}
