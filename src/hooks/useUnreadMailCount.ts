import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

const LOG_SOURCE = "useUnreadMailCount";

export function useUnreadMailCount() {
  const [unreadMailCount, setUnreadMailCount] = useState(0);

  useEffect(() => {
    const refreshUnread = async () => {
      try {
        const response = await fetch("/api/mail/accounts");
        if (!response.ok) return;
        const accounts = (await response.json()) as Array<{
          _count: { messages: number };
        }>;
        setUnreadMailCount(
          accounts.reduce(
            (total, account) => total + account._count.messages,
            0
          )
        );
      } catch (error) {
        void logger.debug(
          "Unread mail badge is unavailable",
          { error: error instanceof Error ? error.message : String(error) },
          LOG_SOURCE
        );
      }
    };
    void refreshUnread();
    window.addEventListener("mail-unread-changed", refreshUnread);
    return () =>
      window.removeEventListener("mail-unread-changed", refreshUnread);
  }, []);

  return unreadMailCount;
}
