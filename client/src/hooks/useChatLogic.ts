/// <reference types="vite/client" />
import { useState, useEffect } from "react";
import axios from "axios";
import { Socket } from "socket.io-client";
import { db } from "@/utils/db";

/**
 * Interface for the properties required by useChatLogic hook
 */
interface UseChatLogicProps {
  address: string | null;
  socket: Socket | null;
  ephemeralPublicKey: string | null;
  computeSecret: (peerAddress: string, peerPublicKey: string) => void;
  decrypt: (peerAddress: string, encryptedMessage: string) => string;
  hasSecret: (peerAddress: string) => boolean;
  relayUrl: string; // TANGKAP URL DISINI
}

export interface HandshakeRequest {
  from: string;
  ephemeralPublicKey: string;
  username?: string;
}

export const useChatLogic = ({
  address,
  socket,
  ephemeralPublicKey,
  computeSecret,
  decrypt,
  hasSecret,
  relayUrl,
}: UseChatLogicProps) => {
  const [targetUsername, setTargetUsername] = useState<string>("");
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [activeUsername, setActiveUsername] = useState<string>("");
  const [myUsername, setMyUsername] = useState<string>("Loading...");
  const [pendingRequests, setPendingRequests] = useState<HandshakeRequest[]>(
    [],
  );
  const [isSearching, setIsSearching] = useState<boolean>(false);

  useEffect(() => {
    if (address && relayUrl) {
      axios
        .get(`${relayUrl}/auth/user/${address}`)
        .then((res) => setMyUsername(res.data.username))
        .catch(() => setMyUsername("Unknown Profile"));
    }
  }, [address, relayUrl]);

  useEffect(() => {
    if (!socket) return;

    const onHandshakeOffer = async (data: {
      from: string;
      ephemeralPublicKey: string;
    }) => {
      let incomingUser = "Unknown";
      try {
        const res = await axios.get(`${relayUrl}/auth/user/${data.from}`);
        incomingUser = res.data.username;
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error("Failed to fetch peer username:", err.message);
        }
      }

      setPendingRequests((prev) => {
        if (prev.find((req) => req.from === data.from)) return prev;
        return [...prev, { ...data, username: incomingUser }];
      });
    };

    const onHandshakeAnswer = (data: {
      from: string;
      ephemeralPublicKey: string;
    }) => {
      computeSecret(data.from, data.ephemeralPublicKey);
    };

    const onReceiveMessage = async (data: {
      from: string;
      message: string;
      timestamp: number;
    }) => {
      const decryptedText = decrypt(data.from, data.message);
      await db.messages.add({
        chatId: data.from,
        text: decryptedText,
        isMine: false,
        timestamp: data.timestamp,
      });
    };

    socket.on("handshake_offer", onHandshakeOffer);
    socket.on("handshake_answer", onHandshakeAnswer);
    socket.on("receive_message", onReceiveMessage);

    return () => {
      socket.off("handshake_offer", onHandshakeOffer);
      socket.off("handshake_answer", onHandshakeAnswer);
      socket.off("receive_message", onReceiveMessage);
    };
  }, [socket, computeSecret, decrypt, relayUrl]);

  const handleConnectPeer = async () => {
    if (!targetUsername.trim()) return;
    setIsSearching(true);
    try {
      const res = await axios.get(
        `${relayUrl}/auth/address/${targetUsername.trim()}`,
      );
      const peerAddress = res.data.address.toLowerCase();

      if (address && peerAddress === address.toLowerCase()) {
        alert("Cannot chat with yourself!");
        setIsSearching(false);
        return;
      }

      setActiveChat(peerAddress);
      setActiveUsername(targetUsername.trim());

      if (!hasSecret(peerAddress) && socket) {
        socket.emit("handshake_init", {
          to: peerAddress,
          ephemeralPublicKey: ephemeralPublicKey,
        });
      }
      setTargetUsername("");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        alert(
          err.response?.data?.error || "Username not found on the network!",
        );
      } else {
        alert("An unknown error occurred.");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleAcceptRequest = async (request: HandshakeRequest) => {
    computeSecret(request.from, request.ephemeralPublicKey);
    if (socket) {
      socket.emit("handshake_response", {
        to: request.from,
        ephemeralPublicKey: ephemeralPublicKey,
      });
    }
    setPendingRequests((prev) =>
      prev.filter((req) => req.from !== request.from),
    );

    setActiveChat(request.from);

    if (request.username && request.username !== "Unknown") {
      setActiveUsername(request.username);
    } else {
      try {
        const res = await axios.get(`${relayUrl}/auth/user/${request.from}`);
        setActiveUsername(res.data.username);
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.warn("User info fetch failed:", err.message);
        }
        setActiveUsername("Unknown User");
      }
    }
  };

  const handleRejectRequest = (requestAddress: string) => {
    setPendingRequests((prev) =>
      prev.filter((req) => req.from !== requestAddress),
    );
  };

  return {
    targetUsername,
    setTargetUsername,
    activeChat,
    activeUsername,
    myUsername,
    pendingRequests,
    isSearching,
    handleConnectPeer,
    handleAcceptRequest,
    handleRejectRequest,
  };
};
