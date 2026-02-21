import { useState, useEffect } from "react";
import { io } from "socket.io-client";

// Sesuaikan dengan URL Relay Server
const SOCKET_URL = "http://localhost:3001";

export const useSocket = (token) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    // Initialize socket connection with JWT token
    const newSocket = io(SOCKET_URL, {
      auth: { token },
    });

    // Jalankan async pas event sukses konek
    newSocket.on("connect", () => {
      console.log("🟢 Socket connected");
      setIsConnected(true);
      setSocket(newSocket);
    });

    // Bersihin state pas disconnect
    newSocket.on("disconnect", () => {
      console.log("🔴 Socket disconnected");
      setIsConnected(false);
      setSocket(null);
    });

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  return { socket, isConnected };
};
