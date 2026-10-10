"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { useNeedt3Ui } from "@/store/needt3-ui";

import { sectionFromHash } from "./derive";

/**
 * `/settings#section` with design_v3 on: open the Settings sheet at that
 * section and leave the URL on Today, the page the sheet sits over. The hash
 * only exists in the browser, so this is a client step after the server has
 * decided the route exists.
 */
export function SettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    useNeedt3Ui.getState().openSettings(sectionFromHash(window.location.hash));
    router.replace("/today");
  }, [router]);
  return null;
}
