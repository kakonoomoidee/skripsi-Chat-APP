import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Socket } from "socket.io-client";

/**
 * Interface defining the dependencies required by the useChatLogic hook.
 */
interface UseChatLogicProps {
  address: string | null;
  socket: Socket | null;
  generateHandshakeKeys: (peerAddress: string) => string;
  computeSecret: (peerAddress: string, peerPublicKey: string) => void;
  hasSecret: (peerAddress: string) => boolean;
  relayUrl: string;
  removeSecret: (addr: string) => void;
  forceDisconnectPeer?: (addr: string) => void;
}

/**
 * Interface representing an incoming handshake connection request.
 */
export interface HandshakeRequest {
  from: string;
  ephemeralPublicKey: string;
  username?: string;
}

/**
 * Interface representing an active chat session.
 */
export interface ActiveSession {
  address: string;
  username: string;
}

/**
 * Custom hook to manage chat sessions, handle peer discovery, and coordinate
 * cryptographic handshakes via Socket.IO.
 * @param {UseChatLogicProps} props - Dependencies including socket instance and crypto functions.
 * @returns {object} Chat session states and handler functions.
 */
export const useChatLogic = ({
  address,
  socket,
  generateHandshakeKeys,
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

  /**
   * Closes the current active chat session and clears the active chat state.
   * @returns {void}
   */
  const closeChat = useCallback((): void => {
    setActiveChat(null);
    setActiveUsername("");
    console.log("[Chat Logic] Active chat window closed.");
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
      console.log(`[Handshake] Incoming offer received from: ${peerAddress}`);

      const existingSession = activeSessionsRef.current.find(
        (s) => s.address === peerAddress,
      );

      if (existingSession) {
        console.log(
          `[Handshake] Auto-accepting offer from known active session: ${peerAddress}`,
        );
        if (forceDisconnectPeer) forceDisconnectPeer(peerAddress);

        const myNewPubKey = generateHandshakeKeys(peerAddress);
        console.log(
          `[Crypto PROOF] Re-Handshake Auto. Ephemeral PubKey generated for ${peerAddress}: ${myNewPubKey.substring(0, 15)}...`,
        );

        computeSecret(peerAddress, data.ephemeralPublicKey);
        socket.emit("handshake_response", {
          to: peerAddress,
          ephemeralPublicKey: myNewPubKey,
        });
        setInitiators((prev) => ({ ...prev, [peerAddress]: false }));
        return;
      }

      let incomingUser = "Unknown";
      try {
        const res = await axios.get(`${relayUrl}/auth/user/${data.from}`);
        incomingUser = res.data.username;
      } catch (err) {
        console.warn(
          `[Chat Logic] Failed to fetch username for incoming address: ${data.from}. Error: ${err}`,
        );
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
      console.log(
        `[Handshake] Answer received from: ${data.from}. Computing shared secret...`,
      );
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
    generateHandshakeKeys,
    forceDisconnectPeer,
  ]);

  /**
   * Resolves a target username to an address and initiates a handshake request.
   * @returns {Promise<void>}
   */
  const handleConnectPeer = async (): Promise<void> => {
    if (!targetUsername.trim()) return;

    setIsSearching(true);
    setSearchError("");
    console.log(
      `[Chat Logic] Attempting connection to username: ${targetUsername.trim()}`,
    );

    try {
      const res = await axios.get(
        `${relayUrl}/auth/address/${targetUsername.trim()}`,
      );
      const peerAddress = res.data.address.toLowerCase();

      if (address && peerAddress === address.toLowerCase()) {
        console.warn("[Chat Logic] User attempted self-connection. Blocked.");
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
        const myNewPubKey = generateHandshakeKeys(peerAddress);
        console.log(
          `[Crypto PROOF] Handshake Init. Ephemeral PubKey generated for ${peerAddress}: ${myNewPubKey.substring(0, 15)}...`,
        );
        console.log(
          `[Handshake] Transmitting initial offer to: ${peerAddress}`,
        );
        socket.emit("handshake_init", {
          to: peerAddress,
          ephemeralPublicKey: myNewPubKey,
        });
      }
      setTargetUsername("");
    } catch (err) {
      console.error(
        `[Chat Logic] Target user not found on network: ${targetUsername.trim()}. Error: ${err}`,
      );
      setSearchError("Username not found on the network.");
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Accepts an incoming handshake request and computes the shared secret.
   * @param {HandshakeRequest} request - The pending handshake request object.
   * @returns {Promise<void>}
   */
  const handleAcceptRequest = async (
    request: HandshakeRequest,
  ): Promise<void> => {
    console.log(
      `[Handshake] Accepting connection request from: ${request.from}`,
    );

    const peerAddress = request.from.toLowerCase();
    const myNewPubKey = generateHandshakeKeys(peerAddress);

    console.log(
      `[Crypto PROOF] Handshake Accept. Ephemeral PubKey generated for ${peerAddress}: ${myNewPubKey.substring(0, 15)}...`,
    );

    computeSecret(peerAddress, request.ephemeralPublicKey);

    setInitiators((prev) => ({ ...prev, [peerAddress]: false }));

    if (socket) {
      socket.emit("handshake_response", {
        to: peerAddress,
        ephemeralPublicKey: myNewPubKey,
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

  /**
   * Rejects and dismisses an incoming handshake request.
   * @param {string} requestAddress - The address of the peer to reject.
   * @returns {void}
   */
  const handleRejectRequest = (requestAddress: string): void => {
    console.log(
      `[Handshake] Rejected connection request from: ${requestAddress}`,
    );
    setPendingRequests((prev) =>
      prev.filter((req) => req.from !== requestAddress),
    );
  };

  /**
   * Switches the active chat window to a different existing session.
   * @param {ActiveSession} session - The session to switch to.
   * @returns {void}
   */
  const switchChat = (session: ActiveSession): void => {
    setActiveChat(session.address);
    setActiveUsername(session.username);
  };

  /**
   * Completely removes a session from memory and clears its cryptographic secrets.
   * @param {string} peerAddress - The address of the peer to disconnect.
   * @returns {void}
   */
  const removeActiveSession = useCallback(
    (peerAddress: string): void => {
      const addr = peerAddress.toLowerCase();
      console.log(`[Chat Logic] Tearing down session and secrets for: ${addr}`);

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
