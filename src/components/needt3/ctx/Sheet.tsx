"use client";

import { type PropsWithChildren } from "react";

import * as Dialog from "@radix-ui/react-dialog";

import { useV3PortalContainer } from "./PortalScope";

export interface SheetProps extends PropsWithChildren {
  open: boolean;
  onClose: () => void;
  side?: "right" | "bottom" | "center";
  from?: DOMRect;
  title: string;
  className?: string;
}

export function Sheet({
  open,
  onClose,
  side = "center",
  title,
  className = "",
  children,
}: SheetProps) {
  const container = useV3PortalContainer();
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      {container && (
        <Dialog.Portal container={container}>
          <Dialog.Overlay className="td-scrim" />
          <Dialog.Content
            className={className}
            style={{
              position: "fixed",
              zIndex: 1001,
              ...(side === "center"
                ? { left: "50%", top: "16vh", transform: "translateX(-50%)" }
                : side === "right"
                  ? { right: 0, top: 0, bottom: 0 }
                  : { left: 0, right: 0, bottom: 0 }),
            }}
            aria-describedby={undefined}
          >
            <Dialog.Title className="sr-only">{title}</Dialog.Title>
            {children}
          </Dialog.Content>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  );
}
