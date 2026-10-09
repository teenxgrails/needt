"use client";

import { type ReactNode } from "react";

import * as Dropdown from "@radix-ui/react-dropdown-menu";

import { useV3PortalContainer } from "../ctx/PortalScope";

export type RichMenuItem =
  | { sep: true }
  | {
      id?: string;
      title: string;
      sub?: string;
      icon?: ReactNode;
      kbd?: string;
      disabled?: boolean;
      onClick?: () => void;
    };

export function RichMenu({
  items,
  trigger,
  width = 300,
  up = false,
  align = "start",
}: {
  items: readonly RichMenuItem[];
  trigger: ReactNode;
  width?: number;
  up?: boolean;
  align?: "start" | "end";
}) {
  const container = useV3PortalContainer();
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>{trigger}</Dropdown.Trigger>
      {container && (
        <Dropdown.Portal container={container}>
          <Dropdown.Content
            className="nx-pop"
            side={up ? "top" : "bottom"}
            align={align}
            sideOffset={6}
            style={{ width, padding: 6, zIndex: 1001 }}
          >
            {items.map((item, index) =>
              "sep" in item ? (
                <Dropdown.Separator
                  key={`separator-${index}`}
                  className="sb-acct-sep"
                />
              ) : (
                <Dropdown.Item
                  key={item.id ?? item.title}
                  className="sb-acct-row"
                  disabled={item.disabled}
                  onSelect={item.onClick}
                  style={{ height: item.sub ? 48 : 32 }}
                >
                  {item.icon && (
                    <span className="sb-acct-ico">{item.icon}</span>
                  )}
                  <span
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <span>{item.title}</span>
                    {item.sub && (
                      <span
                        className="base-meta"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {item.sub}
                      </span>
                    )}
                  </span>
                  {item.kbd && <kbd className="key-cap">{item.kbd}</kbd>}
                </Dropdown.Item>
              )
            )}
          </Dropdown.Content>
        </Dropdown.Portal>
      )}
    </Dropdown.Root>
  );
}
