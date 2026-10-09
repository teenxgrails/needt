"use client";

import { useState } from "react";

import { useSetPref, useSettings } from "@/lib/needt3/hooks/settings";

import { Sheet } from "../ctx/Sheet";
import { SHELL_PLACES, sidebarTiles } from "./places";

export function CustomizeSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const settings = useSettings();
  const save = useSetPref();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = sidebarTiles(settings.data?.prefs.sidebarTiles).map(
    (place) => place.id
  );
  const setTiles = async (next: string[]) => {
    setSaving(true);
    setError(null);
    try {
      await save("sidebarTiles", next);
    } catch {
      setError("Could not save your sidebar. Try again.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Customize Sidebar"
      className="key-sheet"
    >
      <header className="shell-key-sheet-row">
        <h2 className="shell-key-sheet-text">Customize Sidebar</h2>
      </header>
      <p className="base-meta">
        Choose which places appear as tiles. The rest stay in More.
      </p>
      <div className="base-stack">
        {SHELL_PLACES.map((place) => (
          <label key={place.id} className="sb-acct-row">
            <input
              type="checkbox"
              checked={selected.includes(place.id)}
              disabled={saving || !settings.data}
              onChange={(event) => {
                void setTiles(
                  event.target.checked
                    ? [...selected, place.id]
                    : selected.filter((id) => id !== place.id)
                );
              }}
            />
            {place.label}
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="base-meta">
          {error}
        </p>
      )}
      <footer className="base-row">
        <button
          className="nx-btn nx-btn-text"
          disabled={saving || !settings.data}
          onClick={() => {
            void setTiles(SHELL_PLACES.slice(0, 5).map((place) => place.id));
          }}
        >
          Reset
        </button>
        <button className="nx-btn nx-btn-secondary" onClick={onClose}>
          Done
        </button>
      </footer>
    </Sheet>
  );
}
