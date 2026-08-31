import React from "react";
import { Card } from "./Card.jsx";
import { Icon } from "../icons/Icon.jsx";
import { TagPill } from "../data-display/TagPill.jsx";
import { Avatar } from "../data-display/Avatar.jsx";
import { ProgressRing } from "../data-display/ProgressRing.jsx";

const meta = { display: "flex", alignItems: "center", gap: "var(--space-1)" };

export function TaskCard({ client, title, tags = [], assignee, attachments, progress, comments, due, onClick, style }) {
  return (
    <Card hoverable onClick={onClick} style={style}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
        <span style={{ fontSize: "var(--text-xxs)", color: "var(--text-muted)" }}>Client: {client}</span>
        <h3 style={{ margin: 0, fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", lineHeight: "var(--leading-snug)", color: "var(--text)" }}>{title}</h3>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-1-5)" }}>
        {tags.map((t) => <TagPill key={t.label} label={t.label} color={t.color} />)}
        {assignee ? (
          <span
            className="theme-surface"
            style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-1-5)", borderRadius: "var(--radius-full)", background: "var(--surface-2)", padding: "2px var(--space-2) 2px 2px" }}
          >
            <Avatar initials={assignee.initials} size={18} />
            <span style={{ fontSize: "var(--text-xxs)", color: "var(--text-2)" }}>{assignee.name}</span>
          </span>
        ) : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3-5)", borderTop: "1px solid var(--border)", paddingTop: "var(--space-2-5)", fontSize: "var(--text-xxs)", color: "var(--text-muted)" }}>
        <span style={meta}><Icon name="paperclip" size={13} /> {attachments}</span>
        <span style={meta}><ProgressRing value={progress} /> {progress}%</span>
        <span style={meta}><Icon name="comment" size={13} /> {comments}</span>
        <span style={{ ...meta, marginLeft: "auto" }}><Icon name="clock" size={13} /> {due}</span>
      </div>
    </Card>
  );
}
