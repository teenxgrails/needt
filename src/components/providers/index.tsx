import { PropsWithChildren } from "react";

import { PWARegister } from "@/components/pwa/PWARegister";

import { MotionRuntime } from "./MotionRuntime";
import { CustomizationRuntime } from "./CustomizationRuntime";
import { RealtimeSyncProvider } from "./RealtimeSyncProvider";
import { SessionProvider } from "./SessionProvider";
import { TanstackQueryProvider } from "./TanstackQueryProvider";
import { ThemeProvider } from "./ThemeProvider";

export function Providers({ children }: PropsWithChildren) {
  return (
    <TanstackQueryProvider>
      <ThemeProvider attribute="data-theme" enableSystem={true}>
        <CustomizationRuntime>
          <MotionRuntime>
            <SessionProvider>
              <RealtimeSyncProvider>
                {children}
                <PWARegister />
              </RealtimeSyncProvider>
            </SessionProvider>
          </MotionRuntime>
        </CustomizationRuntime>
      </ThemeProvider>
    </TanstackQueryProvider>
  );
}
