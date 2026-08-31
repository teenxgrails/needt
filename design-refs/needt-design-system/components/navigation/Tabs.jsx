import React from "react";

export function Tabs({ tabs, value, onChange, style, ...rest }) {
  return (
    <nav style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", ...style }} {...rest}>
      {tabs.map((tab) => {
        const active = tab === value;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange && onChange(tab)}
            className="theme-surface"
            onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.color = "var(--text)"; } }}
            onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; } }}
            style={{
              borderRadius: "var(--radius-md)",
              border: "none",
              padding: "6px var(--space-3)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-xs)",
              cursor: "pointer",
              background: active ? "var(--surface-2)" : "transparent",
              color: active ? "var(--text)" : "var(--text-muted)",
              fontWeight: active ? "var(--weight-medium)" : "var(--weight-regular)",
            }}
          >
            {tab}
          </button>
        );
      })}
    </nav>
  );
}
