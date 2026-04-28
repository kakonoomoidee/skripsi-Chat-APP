import { useState, useEffect, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { useUIStore } from "@/store";

const SOCKET_EVENTS = {
  connect: "connect",
  disconnect: "disconnect",
  connectError: "connect_error",
  sessionRevoked: "session_revoked",
} as const;

interface SessionRevokedPayload {
  reason: string;
}

/**
 * Interface defining the return values for the useSocket hook.
 */
export interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  isSessionRevoked: boolean;
}

/**
 * Custom hook to initialize and manage the Socket.IO connection.
 * Handles connection state, cross-device session revocation, and automated cleanup.
 *
 * @param {string | null} token - The JWT authentication token for socket authorization.
 * @param {string} relayUrl - The HTTP/WS URL of the active relay server.
 * @returns {UseSocketReturn} The socket instance, connection status, and session revocation state.
 */
export const useSocket = (
  token: string | null,
  relayUrl: string,
): UseSocketReturn => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isSessionRevoked, setIsSessionRevoked] = useState<boolean>(false);
  const { showToast } = useUIStore();

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
    setIsSessionRevoked(false);
    socket.connect();

    const onConnect = () => {
      console.log(
        `[Socket Manager] Successfully connected to relay server: ${relayUrl}`,
      );
      setIsConnected(true);
    };

    const onDisconnect = (reason: string) => {
      console.warn(
        `[Socket Manager] Disconnected from relay server. Reason: ${reason}`,
      );
      setIsConnected(false);
    };

    const onError = (err: Error) => {
      console.error(`[Socket Error] Connection failed: ${err.message}`);
      setIsConnected(false);
    };

    const onSessionRevoked = (data: SessionRevokedPayload) => {
      console.warn(
        `[Socket Manager] Session Revoked by Server: ${data.reason}`,
      );
      showToast(data.reason, "error");

      socket.disconnect();
      setIsSessionRevoked(true);
    };

    socket.on(SOCKET_EVENTS.connect, onConnect);
    socket.on(SOCKET_EVENTS.disconnect, onDisconnect);
    socket.on(SOCKET_EVENTS.connectError, onError);
    socket.on(SOCKET_EVENTS.sessionRevoked, onSessionRevoked);

    return () => {
      console.log(
        "[Socket Manager] Cleaning up and terminating socket connection.",
      );
      socket.off(SOCKET_EVENTS.connect, onConnect);
      socket.off(SOCKET_EVENTS.disconnect, onDisconnect);
      socket.off(SOCKET_EVENTS.connectError, onError);
      socket.off(SOCKET_EVENTS.sessionRevoked, onSessionRevoked);
      socket.disconnect();
    };
  }, [socket, relayUrl, showToast]);

  return { socket, isConnected, isSessionRevoked };
};
