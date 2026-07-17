"use client";

import { createContext, useContext } from "react";

import type { Session } from "next-auth";

export type AppSessionStatus = "authenticated" | "loading" | "unauthenticated";

export interface AppSessionState {
  data: Session | null;
  status: AppSessionStatus;
}

export const AppSessionContext = createContext<AppSessionState | null>(null);

export function useAppSession(): AppSessionState {
  const context = useContext(AppSessionContext);
  if (!context) {
    throw new Error("useAppSession must be used within SessionProvider");
  }
  return context;
}
