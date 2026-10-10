"use client";

import { ComposerHost } from "../composer/Composer";
import { CornerLayer } from "../corner/CornerLayer";
import { SettingsSheet } from "../settings/SettingsSheet";

/**
 * The hosts both UIs open through the store: the Settings sheet, the composer
 * and Ask (the corner layer). They are one fixed sibling in the frame, beside
 * the UI-dependent `overlays` slot, so they exist on the phone and on the
 * desktop and are never remounted when the UI changes (a composer that is
 * open stays open when the window crosses 700 px). The Paywall host is the
 * same kind of thing; it sits in `V3Root`, a sibling of the shell.
 */
export function PermanentHosts() {
  return (
    <>
      <SettingsSheet />
      <ComposerHost />
      <CornerLayer />
    </>
  );
}
