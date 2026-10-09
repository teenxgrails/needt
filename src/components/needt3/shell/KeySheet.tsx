"use client";

import { Sheet } from "../ctx/Sheet";
import { SHELL_SHORTCUTS } from "./keys";

export function KeySheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Keyboard" className="key-sheet">
      <header className="shell-key-sheet-row">
        <h2 className="shell-key-sheet-text">Keyboard</h2>
        <span className="base-meta-muted">
          Press ? anywhere to bring this back.
        </span>
        <button className="nx-btn nx-btn-text" onClick={onClose}>
          Close
        </button>
      </header>
      <div className="scroll-inner shell-key-sheet-scroll-inner">
        {(["Everywhere", "Go to"] as const).map((group) => (
          <section className="base-stack shell-key-sheet-stack" key={group}>
            <span className="base-section-label shell-key-sheet-span">
              {group}
            </span>
            {SHELL_SHORTCUTS.filter((shortcut) => shortcut.group === group).map(
              (shortcut) => (
                <span className="shell-key-sheet-row-2" key={shortcut.label}>
                  <span className="shell-key-sheet-text-3">
                    {shortcut.label}
                  </span>
                  <span className="shell-key-sheet-row-3">
                    {shortcut.keys.map((key) => (
                      <kbd className="key-cap" key={key}>
                        {key}
                      </kbd>
                    ))}
                  </span>
                </span>
              )
            )}
          </section>
        ))}
      </div>
    </Sheet>
  );
}
