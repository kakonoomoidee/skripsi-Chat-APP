import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Socket } from "socket.io-client";

interface UseChatLogicProps {
  address: string | null;
  socket: Socket | null;
  ephemeralPublicKey: string | null;
  computeSecret: (peerAddress: string, peerPublicKey: string) => void;
  hasSecret: (peerAddress: string) => boolean;
  relayUrl: string;
  removeSecret: (addr: string) => void;
  forceDisconnectPeer?: (addr: string) => void;
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

export const useChatLogic = ({
  address,
  socket,
  ephemeralPublicKey,
  computeSecret,
  hasSecret,
  relayUrl,
  removeSecret,
  forceDisconnectPeer,
}: UseChatLogicProps) => {
  const [targetUsername, setTargetUsername] = useState<string>("");

  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [activeUsername, setActiveUsername] = useState<string>("");
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);

  const [myUsername, setMyUsername] = useState<string>("Loading...");
  const [pendingRequests, setPendingRequests] = useState<HandshakeRequest[]>(
    [],
  );
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [initiators, setInitiators] = useState<Record<string, boolean>>({});
  const [searchError, setSearchError] = useState<string>("");
  const [isPeerTyping, setIsPeerTyping] = useState<boolean>(false);

  const activeSessionsRef = useRef<ActiveSession[]>([]);
  const activeChatRef = useRef<string | null>(null);

  useEffect(() => {
    activeSessionsRef.current = activeSessions;
  }, [activeSessions]);
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const closeChat = useCallback(() => {
    setActiveChat(null);
    setActiveUsername("");
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeChat();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [closeChat]);

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
      // JIKA USER BARU AJA REFRESH TAPI ZOMBIE MASIH AKTIF
      if (existingSession && ephemeralPublicKey) {
        if (forceDisconnectPeer) forceDisconnectPeer(peerAddress);

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
      } catch {}

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
  }, [
    socket,
    computeSecret,
    relayUrl,
    ephemeralPublicKey,
    forceDisconnectPeer,
  ]);

  const handleConnectPeer = async (): Promise<void> => {
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
    } catch {
      setSearchError("Username not found on the network.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAcceptRequest = async (
    request: HandshakeRequest,
  ): Promise<void> => {
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

  const handleRejectRequest = (requestAddress: string): void => {
    setPendingRequests((prev) =>
      prev.filter((req) => req.from !== requestAddress),
    );
  };

  const switchChat = (session: ActiveSession): void => {
    setActiveChat(session.address);
    setActiveUsername(session.username);
  };

  const removeActiveSession = useCallback(
    (peerAddress: string) => {
      const addr = peerAddress.toLowerCase();

      setActiveSessions((prev) =>
        prev.filter((s) => s.address.toLowerCase() !== addr),
      );

      setInitiators((prev) => {
        const next = { ...prev };
        delete next[addr];
        return next;
      });

      removeSecret(addr);

      if (activeChatRef.current?.toLowerCase() === addr) {
        closeChat();
      }
    },
    [closeChat, removeSecret],
  );

  return {
    targetUsername,
    setTargetUsername,
    activeChat,
    activeUsername,
    myUsername,
    pendingRequests,
    activeSessions,
    switchChat,
    closeChat,
    isSearching,
    initiators,
    handleConnectPeer,
    handleAcceptRequest,
    handleRejectRequest,
    searchError,
    isPeerTyping,
    setIsPeerTyping,
    removeActiveSession,
  };
};
