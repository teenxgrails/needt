"use client";

/* DOCUMENTS — a pinned grid plus a list, each card a miniature of its own
 * text.
 *
 * PORT.md §3: "Documents (`DocsScreen`) ... a pinned grid plus a list, each
 * card a miniature of its own text." Ported from
 * `Content height and label fixes/needt-app/DocsScreen.jsx`'s `DocCard` —
 * the 208×260 card with a page peeking out of it — but that kit drew every
 * card's page with the same three-line rhythm. `doc-lines.ts` derives the
 * rhythm from the document's own title instead, so a card reads as a
 * miniature of THAT document rather than a coloured swatch with a caption,
 * and the same rule draws the compact page swatch on a list row.
 *
 * PORT.md §0 rule 6: block bodies are `--surface-raised`, colour is a mark.
 * The project hue lives on the tile only — the sheet inside the card stays
 * the same raised white every project's card gets.
 *
 * Exported, not mounted: this drops into `screenSlots.docs` inside
 * `ScreenFrame`, which already draws the "Documents" title and blurb — so
 * this file owns the toolbar and the two sections beneath it, not a second
 * page title.
 */
import * as React from "react";

import {
  LuEllipsis,
  LuExternalLink,
  LuFileText,
  LuPlus,
  LuStar,
  LuTrash2,
  LuUpload,
} from "react-icons/lu";

import { project as resolveProject } from "@/lib/needt/derive";
import { projects as fixtureProjects } from "@/lib/needt/fixture";
import type { NeedtProject } from "@/lib/needt/types";

import {
  Glyph,
  Hung,
  IconButton,
  MenuItem,
  MenuSeparator,
} from "../shell/chrome";
import { docLineWidths } from "./doc-lines";
import { DOCS_FIXTURE, type DocFixtureItem } from "./docs-fixture";

export interface DocsScreenProps {
  docs?: readonly DocFixtureItem[];
  projects?: readonly NeedtProject[];
  onOpen?: (doc: DocFixtureItem) => void;
  onNew?: () => void;
  onImport?: () => void;
}

function hueOf(name: string | null, projects: readonly NeedtProject[]): string {
  return resolveProject(name, projects)?.hue ?? "var(--text-disabled)";
}

/** The page peeking out of a card, or the small swatch on a list row — one
 *  component either way, so a document's own miniature never has two
 *  different implementations to drift apart. */
function DocPage({
  title,
  lines,
  width,
  height,
}: {
  title: string;
  lines: number;
  width: number;
  height: number;
}) {
  const widths = docLineWidths(title, lines);
  return (
    <span
      className="raised"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: Math.max(2, Math.round(height / 22)),
        width,
        height,
        padding: Math.round(width * 0.05),
        borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
        overflow: "hidden",
      }}
    >
      {widths.map((w, i) => (
        <span
          key={i}
          style={{
            flex: "none",
            height: Math.max(2, Math.round(height / 34)),
            width: `${w}%`,
            borderRadius: 2,
            background: i === 0 ? "var(--fill-6)" : "var(--fill-4)",
          }}
        />
      ))}
    </span>
  );
}

function DocMenu({
  onOpen,
  starred,
  onToggleStar,
  onTrash,
}: {
  onOpen?: () => void;
  starred: boolean;
  onToggleStar: () => void;
  onTrash: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Hung
      open={open}
      kind="menu"
      onDismiss={() => setOpen(false)}
      trigger={
        <span
          className="reveal-on-hover"
          style={{ marginLeft: "auto" }}
          onClick={(event) => event.stopPropagation()}
        >
          <IconButton
            label="More"
            variant="ghost"
            icon={<Glyph of={LuEllipsis} size={14} />}
            onClick={() => setOpen((v) => !v)}
          />
        </span>
      }
    >
      <MenuItem
        icon={<Glyph of={LuExternalLink} size={14} />}
        onClick={() => {
          setOpen(false);
          onOpen?.();
        }}
      >
        Open
      </MenuItem>
      <MenuItem
        icon={<Glyph of={LuStar} size={14} filled={starred} />}
        onClick={() => {
          setOpen(false);
          onToggleStar();
        }}
      >
        {starred ? "Unstar" : "Star"}
      </MenuItem>
      <MenuSeparator />
      <MenuItem
        destructive
        icon={<Glyph of={LuTrash2} size={14} />}
        onClick={() => {
          setOpen(false);
          onTrash();
        }}
      >
        Move to trash
      </MenuItem>
    </Hung>
  );
}

/** 208×260, a page peeking out of the top — the pinned grid's card. */
function DocCard({
  doc,
  hue,
  starred,
  onOpen,
  onToggleStar,
  onTrash,
}: {
  doc: DocFixtureItem;
  hue: string;
  starred: boolean;
  onOpen?: () => void;
  onToggleStar: () => void;
  onTrash: () => void;
}) {
  return (
    <article
      className="card nt-card"
      data-interactive="true"
      onClick={onOpen}
      style={{
        width: 208,
        height: 260,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        cursor: "default",
      }}
    >
      <span style={{ margin: "10px 10px 0", flex: 1, minHeight: 0 }}>
        <DocPage title={doc.title} lines={doc.lines} width={188} height={140} />
      </span>
      <span
        style={{
          padding: 11,
          display: "flex",
          flexDirection: "column",
          gap: 5,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              font: "var(--type-ui-medium)",
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {doc.title}
          </span>
          <DocMenu
            onOpen={onOpen}
            starred={starred}
            onToggleStar={onToggleStar}
            onTrash={onTrash}
          />
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              flex: "1 1 auto",
              minWidth: 0,
              font: "var(--type-meta)",
              color: "var(--text-quaternary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {doc.meta}
          </span>
          {doc.project ? (
            <span
              className="chip nt-chip"
              style={{
                height: 20,
                flex: "none",
                maxWidth: 96,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: hue,
                  flex: "none",
                }}
              />
              {doc.project}
            </span>
          ) : null}
        </span>
      </span>
    </article>
  );
}

/** A row in the list: the same miniature page, small, on the left. */
function DocRow({
  doc,
  hue,
  starred,
  onOpen,
  onToggleStar,
  onTrash,
}: {
  doc: DocFixtureItem;
  hue: string;
  starred: boolean;
  onOpen?: () => void;
  onToggleStar: () => void;
  onTrash: () => void;
}) {
  return (
    <article
      className="card nt-card"
      data-interactive="true"
      onClick={onOpen}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        height: 56,
        padding: "0 11px 0 0",
        cursor: "default",
      }}
    >
      <span
        style={{
          flex: "none",
          width: 36,
          height: 44,
          margin: "6px 0 6px 8px",
          borderRadius: "var(--radius-md) var(--radius-md) 0 0",
          overflow: "hidden",
          boxShadow: "var(--shadow-ring)",
        }}
      >
        <DocPage title={doc.title} lines={5} width={36} height={44} />
      </span>
      <span
        style={{
          flex: "1 1 auto",
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ flex: "1 1 auto", minWidth: 0 }}>
          <span
            style={{
              display: "block",
              font: "var(--type-ui-medium)",
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {doc.title}
          </span>
          <span
            style={{
              display: "block",
              font: "var(--type-meta)",
              color: "var(--text-quaternary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {doc.meta}
          </span>
        </span>
        {doc.project ? (
          <span
            className="chip nt-chip"
            style={{
              flex: "none",
              maxWidth: 120,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                background: hue,
                flex: "none",
              }}
            />
            {doc.project}
          </span>
        ) : null}
      </span>
      <DocMenu
        onOpen={onOpen}
        starred={starred}
        onToggleStar={onToggleStar}
        onTrash={onTrash}
      />
    </article>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: "0 0 11px",
        font: "var(--type-meta-medium)",
        color: "var(--text-quaternary)",
      }}
    >
      {children}
    </h2>
  );
}

export function DocsScreen({
  docs = DOCS_FIXTURE,
  projects = fixtureProjects,
  onOpen,
  onNew,
  onImport,
}: DocsScreenProps) {
  const [starred, setStarred] = React.useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [trashed, setTrashed] = React.useState<ReadonlySet<string>>(
    () => new Set()
  );

  const toggleStar = React.useCallback((id: string) => {
    setStarred((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const trash = React.useCallback((id: string) => {
    setTrashed((current) => new Set(current).add(id));
  }, []);

  const live = React.useMemo(
    () => docs.filter((d) => !trashed.has(d.id)),
    [docs, trashed]
  );
  const pinned = React.useMemo(() => live.filter((d) => d.pinned), [live]);
  const rest = React.useMemo(() => live.filter((d) => !d.pinned), [live]);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div
        style={{ flex: "none", display: "flex", alignItems: "center", gap: 8 }}
      >
        <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>
          {live.length} document{live.length === 1 ? "" : "s"}
        </span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={onImport}>
            <Glyph of={LuUpload} size={16} />
            Import
          </button>
          <button type="button" className="btn" onClick={onNew}>
            <Glyph of={LuPlus} size={16} />
            New document
          </button>
        </span>
      </div>

      <div
        className="scroll-inner"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {live.length === 0 ? (
          <div className="nt-empty">
            <span className="nt-empty-icon">
              <Glyph of={LuFileText} size={24} />
            </span>
            <span className="nt-empty-text">
              Nothing here yet. A new document starts blank; nothing writes
              itself.
            </span>
          </div>
        ) : (
          <>
            {pinned.length ? (
              <section>
                <SectionTitle>Pinned</SectionTitle>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, 208px)",
                    gap: 16,
                  }}
                >
                  {pinned.map((doc) => (
                    <DocCard
                      key={doc.id}
                      doc={doc}
                      hue={hueOf(doc.project, projects)}
                      starred={starred.has(doc.id)}
                      onOpen={onOpen ? () => onOpen(doc) : undefined}
                      onToggleStar={() => toggleStar(doc.id)}
                      onTrash={() => trash(doc.id)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {rest.length ? (
              <section>
                <SectionTitle>All documents</SectionTitle>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  {rest.map((doc) => (
                    <DocRow
                      key={doc.id}
                      doc={doc}
                      hue={hueOf(doc.project, projects)}
                      starred={starred.has(doc.id)}
                      onOpen={onOpen ? () => onOpen(doc) : undefined}
                      onToggleStar={() => toggleStar(doc.id)}
                      onTrash={() => trash(doc.id)}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
