import { useState, useEffect, useMemo } from "react";
import { io, Socket } from "socket.io-client";

/**
 * Interface defining the return values for the useSocket hook.
 */
export interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
}

/**
 * Custom hook to initialize and manage the Socket.IO connection to the active relay server.
 * Handles connection state, authentication payload, and automated cleanup upon unmount.
 *
 * @param {string | null} token - The JWT authentication token for socket authorization.
 * @param {string} relayUrl - The HTTP/WS URL of the active relay server.
 * @returns {UseSocketReturn} The socket instance and its current connection status.
 */
export const useSocket = (
  token: string | null,
  relayUrl: string,
): UseSocketReturn => {
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const socket = useMemo<Socket | null>(() => {
    if (!token || !relayUrl) return null;

    console.log(
      `[Socket Manager] Initializing socket instance for relay: ${relayUrl}`,
    );

    return io(relayUrl, {
      auth: { token },
      autoConnect: false,
    });
  }, [token, relayUrl]);

  useEffect(() => {
    if (!socket) return;

    console.log("[Socket Manager] Executing socket connection...");
    socket.connect();

    const onConnect = () => {
      console.log(
        `[Socket Manager] Successfully connected to relay server: ${relayUrl}`,
      );
      setIsConnected(true);
    };

    const onDisconnect = (reason: string) => {
      console.log(
        `[Socket Manager] Disconnected from relay server. Reason: ${reason}`,
      );
      setIsConnected(false);
    };

    const onError = (err: Error) => {
      console.error(`[Socket Error] Connection failed: ${err.message}`);
      setIsConnected(false);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onError);

    return () => {
      console.log(
        "[Socket Manager] Cleaning up and terminating socket connection.",
      );
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onError);
      socket.disconnect();
    };
  }, [socket, relayUrl]);

  return { socket, isConnected };
};
