export type RelayHealth = "pinging" | "online" | "offline";

const RELAY_PING_TIMEOUT_MS = 5000;

/**
 * Attempts to verify relay reachability via HTTP(S) or WebSocket.
 *
 * @param {string} url - Relay endpoint URL.
 * @returns {Promise<boolean>} True when the relay responds, otherwise false.
 */
export const pingRelayNode = async (url: string): Promise<boolean> => {
  if (!url) return false;

  const normalized = url.trim();
  if (/^https?:/i.test(normalized)) {
    try {
      const baseUrl = normalized.replace(/\/$/, "");
      const httpUrl = `${baseUrl}/ping`;

      const controller = new AbortController();
      const timeoutId = window.setTimeout(
        () => controller.abort(),
        RELAY_PING_TIMEOUT_MS,
      );

      const response = await fetch(httpUrl, {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  if (!/^wss?:/i.test(normalized)) return false;

  return new Promise((resolve) => {
    let settled = false;
    const socket = new WebSocket(normalized);
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        socket.close();
      } catch {}
      resolve(false);
    }, RELAY_PING_TIMEOUT_MS);

    const finalize = (result: boolean): void => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      try {
        socket.close();
      } catch {}
      resolve(result);
    };

    socket.addEventListener("open", () => finalize(true));
    socket.addEventListener("error", () => finalize(false));
  });
};

/**
 * Determines relay health status from ping and alive flags.
 *
 * @param {boolean} isPinging - Whether relay ping is in progress.
 * @param {boolean} isRelayAlive - Whether relay responded healthy.
 * @returns {RelayHealth} Relay health state.
 */
export const getRelayHealth = (
  isPinging: boolean,
  isRelayAlive: boolean,
): RelayHealth => {
  if (isPinging) return "pinging";
  return isRelayAlive ? "online" : "offline";
};
