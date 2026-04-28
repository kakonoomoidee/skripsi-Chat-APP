import { useState, useEffect } from "react";
import ms from "ms";

const RELAY_PING_TIMEOUT_MS = ms("3s");
const RELAY_PING_INTERVAL_MS = ms("5s");

const toHttpRelayUrl = (relayUrl: string): string =>
  relayUrl.replace(/^ws/, "http");

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

    const pingRelay = async (): Promise<void> => {
      if (!activeRelay) return;
      if (isMounted) setIsPinging(true);

      try {
        const baseUrl = toHttpRelayUrl(activeRelay);
        const httpUrl = `${baseUrl}/ping`;

        const controller = new AbortController();
        const timeoutId = window.setTimeout(
          () => controller.abort(),
          RELAY_PING_TIMEOUT_MS,
        );

        await fetch(httpUrl, { mode: "no-cors", signal: controller.signal });
        window.clearTimeout(timeoutId);

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
    const intervalId = window.setInterval(pingRelay, RELAY_PING_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [activeRelay]);

  return { isRelayAlive, isPinging };
};
