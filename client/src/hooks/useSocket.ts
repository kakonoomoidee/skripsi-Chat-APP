/// <reference types="vite/client" />
import { useState, useEffect, useMemo } from "react";
import { io, Socket } from "socket.io-client";

/**
 * 1. Initialize and manage Socket.io connection
 * @param {string | null} token - The JWT authentication token
 * @param {string} relayUrl - The active relay server URL
 * @returns {object} { socket, isConnected }
 */
export const useSocket = (token: string | null, relayUrl: string) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const socket = useMemo<Socket | null>(() => {
    if (!token || !relayUrl) return null;

    return io(relayUrl, {
      auth: { token },
      autoConnect: false,
    });
  }, [token, relayUrl]);

  useEffect(() => {
    if (!socket) return;

    socket.connect();

    const onConnect = () => {
      console.log(`Socket Connected to Relay Server: ${relayUrl}`);
      setIsConnected(true);
    };

    const onDisconnect = () => {
      console.log("Socket Disconnected");
      setIsConnected(false);
    };

    const onError = (err: Error) => {
      console.error("Socket Connection Error:", err.message);
      setIsConnected(false);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onError);
      socket.disconnect();
    };
  }, [socket, relayUrl]);

  return { socket, isConnected };
};
