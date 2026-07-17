"use client";

import { useMemo } from "react";

import {
  SessionProvider as NextAuthSessionProvider,
  useSession,
} from "next-auth/react";

import { AppSessionContext } from "./app-session-context";

function AppSessionStateProvider({ children }: { children: React.ReactNode }) {
  const { data, status } = useSession();
  const value = useMemo(() => ({ data, status }), [data, status]);

  return (
    <AppSessionContext.Provider value={value}>
      {children}
    </AppSessionContext.Provider>
  );
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <AppSessionStateProvider>{children}</AppSessionStateProvider>
    </NextAuthSessionProvider>
  );
}
