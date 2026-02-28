import { useState, useEffect } from "react";

/**
 * Custom hook to monitor the active relay server's status (Online/Offline) via HTTP ping.
 * @param {string} activeRelay - The WebSocket URL of the active relay
 * @returns {{ isRelayAlive: boolean, isPinging: boolean }}
 */
export const useRelayPing = (activeRelay: string) => {
  const [isRelayAlive, setIsRelayAlive] = useState(false);
  const [isPinging, setIsPinging] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const pingRelay = async () => {
      if (!activeRelay) return;
      if (isMounted) setIsPinging(true);
      try {
        const httpUrl = activeRelay.replace(/^ws/, "http");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

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
    const intervalId = setInterval(pingRelay, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [activeRelay]);

  return { isRelayAlive, isPinging };
};
