import { PropsWithChildren } from "react";

import { PWARegister } from "@/components/pwa/PWARegister";

import { CustomizationRuntime } from "./CustomizationRuntime";
import { MotionRuntime } from "./MotionRuntime";
import { RealtimeSyncProvider } from "./RealtimeSyncProvider";
import { SessionProvider } from "./SessionProvider";
import { TanstackQueryProvider } from "./TanstackQueryProvider";
import { ThemeProvider } from "./ThemeProvider";
import { WorkspaceProvider } from "./WorkspaceProvider";

export function Providers({ children }: PropsWithChildren) {
  return (
    <TanstackQueryProvider>
      <ThemeProvider attribute="data-theme" enableSystem={true}>
        <CustomizationRuntime>
          <MotionRuntime>
            <SessionProvider>
              <WorkspaceProvider>
                <RealtimeSyncProvider>
                  {children}
                  <PWARegister />
                </RealtimeSyncProvider>
              </WorkspaceProvider>
            </SessionProvider>
          </MotionRuntime>
        </CustomizationRuntime>
      </ThemeProvider>
    </TanstackQueryProvider>
  );
}
