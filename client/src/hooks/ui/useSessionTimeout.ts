import { useEffect, useCallback } from "react";
import ms from "ms";

const LAST_ACTIVITY_KEY = "securep2p_last_activity";
const DEFAULT_TIMEOUT_MS = ms("1h");
const INACTIVITY_CHECK_INTERVAL_MS = ms("1m");
const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
] as const;

/**
 * Custom hook to securely manage user session timeout due to inactivity.
 * @param {function} onTimeout - The callback function to execute when the session expires.
 * @param {number} [timeoutMs=3600000] - The timeout duration in milliseconds (default: 1 hour).
 * @returns {void}
 */
export const useSessionTimeout = (
  onTimeout: () => void,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): void => {
  const updateLastActivity = useCallback((): void => {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }, []);

  const checkInactivity = useCallback((): void => {
    const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);
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

    const intervalId = window.setInterval(
      checkInactivity,
      INACTIVITY_CHECK_INTERVAL_MS,
    );

    const handleActivity = (): void => {
      updateLastActivity();
    };

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    const handleVisibilityChange = (): void => {
      if (!document.hidden) {
        checkInactivity();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkInactivity, updateLastActivity]);
};
