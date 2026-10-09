"use client";

import { useEffect, useRef, useState } from "react";

import { FiCloudOff } from "react-icons/fi";

import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { useAppSession } from "@/components/providers/app-session-context";

import {
  OFFLINE_SCHEMA_VERSION,
  setNeedtOfflineScope,
} from "@/lib/pwa/offline-client";

import strings from "../../../../docs/port/prototype/port/strings/en.json";
import { useDesignV3 } from "../root/V3Root";

const copy = strings["states.jsx"].StOfflineIndicator;

export function StOfflineIndicator() {
  const enabled = useDesignV3();
  const { data: session } = useAppSession();
  const { activeWorkspace } = useWorkspace();
  const userId = session?.user?.id;
  const workspaceId = activeWorkspace?.workspace.id;
  const identity = userId && workspaceId ? `${userId}:${workspaceId}` : null;
  const [offline, setOffline] = useState(false);
  const [queue, setQueue] = useState<{
    identity: string | null;
    count: number | null;
  }>({ identity: null, count: null });
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const read = () => {
      setOffline(!navigator.onLine);
      if (navigator.onLine) setOpen(false);
    };
    read();
    window.addEventListener("online", read);
    window.addEventListener("offline", read);
    return () => {
      window.removeEventListener("online", read);
      window.removeEventListener("offline", read);
    };
  }, []);

  useEffect(() => {
    setQueue({ identity, count: null });
    setOpen(false);
    if (!enabled || !userId || !workspaceId || !("serviceWorker" in navigator))
      return;
    let active = true;
    const serviceWorker = navigator.serviceWorker;
    const receive = (event: MessageEvent) => {
      if (!active || event.data?.type !== "NEEDT_OFFLINE_STATE") return;
      // The current worker broadcasts across tabs without scope metadata.
      // Never label an unscoped or another workspace's count as this user's.
      if (event.data.scopeKey !== `${OFFLINE_SCHEMA_VERSION}:${identity}`)
        return;
      const count = Number(event.data.count);
      if (Number.isSafeInteger(count) && count >= 0)
        setQueue({ identity, count });
    };
    void setNeedtOfflineScope({ userId, workspaceId })
      .then(() => {
        if (!active) return;
        serviceWorker.addEventListener("message", receive);
        serviceWorker.controller?.postMessage({
          type: "NEEDT_OFFLINE_STATE_REQUEST",
        });
      })
      .catch(() => undefined);
    return () => {
      active = false;
      serviceWorker.removeEventListener("message", receive);
    };
  }, [enabled, userId, workspaceId, identity]);

  useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  if (!enabled || !offline) return null;
  const count = queue.identity === identity ? queue.count : null;
  const waiting = `${count} ${count === 1 ? "change" : "changes"} waiting`;
  return (
    <span className="state-offline-indicator-row" ref={wrap}>
      <button
        type="button"
        className="st-offline"
        data-st-offline
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <FiCloudOff size={14} aria-hidden />
        <span>offline{count ? ` · ${waiting}` : ""}</span>
      </button>
      {open ? (
        <div className="st-offline-pop" data-st-offline-pop>
          <div className="st-pop-title">
            {count === null
              ? "Offline"
              : count
                ? waiting
                : copy.nothing_waiting}
          </div>
          <div className="st-pop-foot">
            {copy.you_can_keep_working} {copy.edits_sync}{" "}
            {copy.on_their_own_when_youre_back_online}
          </div>
        </div>
      ) : null}
    </span>
  );
}
