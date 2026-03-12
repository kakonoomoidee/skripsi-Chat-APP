import { useEffect, useCallback } from "react";

/**
 * Custom hook to securely manage user session timeout due to inactivity.
 * @param {function} onTimeout - The callback function to execute when the session expires.
 * @param {number} [timeoutMs=3600000] - The timeout duration in milliseconds (default: 1 hour).
 * @returns {void}
 */
export const useSessionTimeout = (
  onTimeout: () => void,
  timeoutMs: number = 3600000,
): void => {
  const updateLastActivity = useCallback((): void => {
    localStorage.setItem("securep2p_last_activity", Date.now().toString());
  }, []);

  const checkInactivity = useCallback((): void => {
    const lastActivityStr = localStorage.getItem("securep2p_last_activity");
    if (lastActivityStr) {
      const lastActivity = parseInt(lastActivityStr, 10);
      if (Date.now() - lastActivity > timeoutMs) {
        onTimeout();
      }
    }
  }, [onTimeout, timeoutMs]);

  useEffect(() => {
    checkInactivity();
    updateLastActivity();

    const intervalId = setInterval(checkInactivity, 60000);

    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
    ];

    const handleActivity = (): void => {
      updateLastActivity();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    const handleVisibilityChange = (): void => {
      if (!document.hidden) {
        checkInactivity();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkInactivity, updateLastActivity]);
};
