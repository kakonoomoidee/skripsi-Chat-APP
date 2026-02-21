import { useState, useEffect, useMemo } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL;

export const useSocket = (token) => {
  const [isConnected, setIsConnected] = useState(false);

  const socket = useMemo(() => {
    if (!token) return null;

    return io(SOCKET_URL, {
      auth: { token },
      autoConnect: false,
    });
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    socket.connect();

    const onConnect = () => {
      console.log("Socket Connected to Relay Server");
      setIsConnected(true);
    };

    const onDisconnect = () => {
      console.log("Socket Disconnected");
      setIsConnected(false);
    };

    const onError = (err) => {
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
  }, [socket]);

  return { socket, isConnected };
};
