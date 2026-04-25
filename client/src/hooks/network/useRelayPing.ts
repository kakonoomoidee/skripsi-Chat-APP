import { useState, useEffect } from "react";
import ms from "ms";

/**
 * Interface defining the return values for the relay ping status.
 */
export interface UseRelayPingReturn {
  isRelayAlive: boolean;
  isPinging: boolean;
}

/**
 * Custom hook to continuously monitor the active relay server's status via HTTP ping.
 * Executes a health check every 5 seconds to determine if the node is online.
 *
 * @param {string} activeRelay - The WebSocket or HTTP base URL of the active relay.
 * @returns {UseRelayPingReturn} The current connection health status and pinging state.
 */
export const useRelayPing = (activeRelay: string): UseRelayPingReturn => {
  const [isRelayAlive, setIsRelayAlive] = useState<boolean>(false);
  const [isPinging, setIsPinging] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const pingRelay = async () => {
      if (!activeRelay) return;
      if (isMounted) setIsPinging(true);

      try {
        const baseUrl = activeRelay.replace(/^ws/, "http");
        const httpUrl = `${baseUrl}/ping`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), ms("3s"));

        await fetch(httpUrl, { mode: "no-cors", signal: controller.signal });
        clearTimeout(timeoutId);

        if (isMounted) {
          setIsRelayAlive(true);
          setIsPinging(false);
        }
      } catch {
        if (isMounted) {
          setIsRelayAlive(false);
          setIsPinging(false);
        }
      }
    };

    pingRelay();
    const intervalId = setInterval(pingRelay, ms("5s"));

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [activeRelay]);

  return { isRelayAlive, isPinging };
};
