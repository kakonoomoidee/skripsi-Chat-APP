import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Socket } from "socket.io-client";

interface UseChatLogicProps {
  address: string | null;
  socket: Socket | null;
  ephemeralPublicKey: string | null;
  computeSecret: (peerAddress: string, peerPublicKey: string) => void;
  hasSecret: (peerAddress: string) => boolean;
  relayUrl: string;
}

export interface HandshakeRequest {
  from: string;
  ephemeralPublicKey: string;
  username?: string;
}

export interface ActiveSession {
  address: string;
  username: string;
}

/**
 * Manage chat sessions, pending handshake requests, and active peers
 * @param {UseChatLogicProps} params - The initialization parameters
 * @returns {object} Context values for chat logic
 */
export const useChatLogic = ({
  address,
  socket,
  ephemeralPublicKey,
  computeSecret,
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
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [initiators, setInitiators] = useState<Record<string, boolean>>({});

  const [searchError, setSearchError] = useState<string>("");

  const activeSessionsRef = useRef<ActiveSession[]>([]);

  useEffect(() => {
    activeSessionsRef.current = activeSessions;
  }, [activeSessions]);

  useEffect(() => {
    setSearchError("");
  }, [targetUsername]);

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
      const peerAddress = data.from.toLowerCase();
      const existingSession = activeSessionsRef.current.find(
        (s) => s.address === peerAddress,
      );

      if (existingSession && ephemeralPublicKey) {
        computeSecret(peerAddress, data.ephemeralPublicKey);
        socket.emit("handshake_response", {
          to: peerAddress,
          ephemeralPublicKey: ephemeralPublicKey,
        });
        setInitiators((prev) => ({ ...prev, [peerAddress]: false }));
        return;
      }

      let incomingUser = "Unknown";
      try {
        const res = await axios.get(`${relayUrl}/auth/user/${data.from}`);
        incomingUser = res.data.username;
      } catch (err) {
        console.error("Failed to fetch peer username");
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

    socket.on("handshake_offer", onHandshakeOffer);
    socket.on("handshake_answer", onHandshakeAnswer);

    return () => {
      socket.off("handshake_offer", onHandshakeOffer);
      socket.off("handshake_answer", onHandshakeAnswer);
    };
  }, [socket, computeSecret, relayUrl, ephemeralPublicKey]);

  const handleConnectPeer = async () => {
    if (!targetUsername.trim()) return;
    setIsSearching(true);
    setSearchError("");

    try {
      const res = await axios.get(
        `${relayUrl}/auth/address/${targetUsername.trim()}`,
      );
      const peerAddress = res.data.address.toLowerCase();

      if (address && peerAddress === address.toLowerCase()) {
        setSearchError("Cannot chat with yourself.");
        setIsSearching(false);
        return;
      }

      setActiveSessions((prev) => {
        if (prev.find((s) => s.address === peerAddress)) return prev;
        return [
          ...prev,
          { address: peerAddress, username: targetUsername.trim() },
        ];
      });

      setActiveChat(peerAddress);
      setActiveUsername(targetUsername.trim());
      setInitiators((prev) => ({ ...prev, [peerAddress]: true }));

      if (!hasSecret(peerAddress) && socket) {
        socket.emit("handshake_init", {
          to: peerAddress,
          ephemeralPublicKey: ephemeralPublicKey,
        });
      }
      setTargetUsername("");
    } catch (err: unknown) {
      setSearchError("Username not found on the network.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAcceptRequest = async (request: HandshakeRequest) => {
    computeSecret(request.from, request.ephemeralPublicKey);
    const peerAddress = request.from.toLowerCase();

    setInitiators((prev) => ({ ...prev, [peerAddress]: false }));

    if (socket) {
      socket.emit("handshake_response", {
        to: request.from,
        ephemeralPublicKey: ephemeralPublicKey,
      });
    }

    setPendingRequests((prev) =>
      prev.filter((req) => req.from !== request.from),
    );

    const finalUsername =
      request.username && request.username !== "Unknown"
        ? request.username
        : "Unknown User";

    setActiveSessions((prev) => {
      if (prev.find((s) => s.address === request.from)) return prev;
      return [...prev, { address: request.from, username: finalUsername }];
    });

    setActiveChat(request.from);
    setActiveUsername(finalUsername);
  };

  const handleRejectRequest = (requestAddress: string) => {
    setPendingRequests((prev) =>
      prev.filter((req) => req.from !== requestAddress),
    );
  };

  const switchChat = (session: ActiveSession) => {
    setActiveChat(session.address);
    setActiveUsername(session.username);
  };

  return {
    targetUsername,
    setTargetUsername,
    activeChat,
    activeUsername,
    myUsername,
    pendingRequests,
    activeSessions,
    switchChat,
    isSearching,
    initiators,
    handleConnectPeer,
    handleAcceptRequest,
    handleRejectRequest,
    searchError,
  };
};
