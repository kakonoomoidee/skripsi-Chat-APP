import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Socket } from "socket.io-client";

/**
 * Interface defining the properties required for the useChatLogic hook.
 */
interface UseChatLogicProps {
  address: string | null;
  socket: Socket | null;
  ephemeralPublicKey: string | null;
  computeSecret: (peerAddress: string, peerPublicKey: string) => void;
  hasSecret: (peerAddress: string) => boolean;
  relayUrl: string;
}

/**
 * Interface defining the structure of a Handshake Request.
 */
export interface HandshakeRequest {
  from: string;
  ephemeralPublicKey: string;
  username?: string;
}

/**
 * Interface defining an Active Session.
 */
export interface ActiveSession {
  address: string;
  username: string;
}

/**
 * Custom hook to manage peer discovery, handshaking (ECDH setup), and active chat sessions.
 * @param {UseChatLogicProps} props - The configuration properties including socket and crypto methods.
 * @returns Chat logic state and handler functions.
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

  // FIX BUG HANTU HANDSHAKE: Hapus localStorage, biarkan default kosong saat refresh!
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

  /**
   * Sync active sessions to ref for access inside socket callbacks.
   */
  useEffect(() => {
    activeSessionsRef.current = activeSessions;
  }, [activeSessions]);

  /**
   * Clear search error when the target username input changes.
   */
  useEffect(() => {
    setSearchError("");
  }, [targetUsername]);

  /**
   * Fetch the current user's profile from the relay server.
   */
  useEffect(() => {
    if (address && relayUrl) {
      axios
        .get(`${relayUrl}/auth/user/${address}`)
        .then((res) => setMyUsername(res.data.username))
        .catch(() => setMyUsername("Unknown Profile"));
    }
  }, [address, relayUrl]);

  /**
   * Socket event listeners for handling ECDH Handshake Offers and Answers.
   */
  useEffect(() => {
    if (!socket) return;

    const onHandshakeOffer = async (data: {
      from: string;
      ephemeralPublicKey: string;
    }) => {
      const peerAddress = data.from.toLowerCase();

      // --- LOG BUKTI ECDH (MENERIMA OFFER) ---
      console.log("=========================================");
      console.log("[Phase 3: ECDH Handshake - Offer Received]");
      console.log(
        "[ECDH PROOF] Received Ephemeral Public Key from:",
        peerAddress,
      );
      // ----------------------------------------------

      const existingSession = activeSessionsRef.current.find(
        (s) => s.address === peerAddress,
      );

      if (existingSession && ephemeralPublicKey) {
        console.log("[ECDH PROOF] Computing Shared Secret internally...");
        computeSecret(peerAddress, data.ephemeralPublicKey);

        console.log(
          "[ECDH PROOF] Sending our Ephemeral Public Key as response.",
        );
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
      } catch {
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
      // --- LOG BUKTI ECDH (MENERIMA ANSWER) ---
      console.log("=========================================");
      console.log("[Phase 3: ECDH Handshake - Answer Received]");
      console.log("[ECDH PROOF] Received Ephemeral Public Key from responder.");
      console.log("[ECDH PROOF] Computing final Shared Secret locally...");
      computeSecret(data.from, data.ephemeralPublicKey);
      console.log(
        "[ECDH SUCCESS] Shared Secret established! Ready for AES Encryption.",
      );
      console.log("=========================================");
      // ----------------------------------------------
    };

    socket.on("handshake_offer", onHandshakeOffer);
    socket.on("handshake_answer", onHandshakeAnswer);

    return () => {
      socket.off("handshake_offer", onHandshakeOffer);
      socket.off("handshake_answer", onHandshakeAnswer);
    };
  }, [socket, computeSecret, relayUrl, ephemeralPublicKey]);

  /**
   * Initiates a connection request to a target peer by username.
   * Emits an ECDH handshake initialization.
   * @returns {Promise<void>}
   */
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
        // --- LOG BUKTI ECDH (INISIASI) ---
        console.log("=========================================");
        console.log("[Phase 3: ECDH Handshake - Initiating]");
        console.log(
          "[ECDH PROOF] Emitting Handshake Init with our Ephemeral Public Key.",
        );
        console.log("=========================================");
        // ----------------------------------------------
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

  /**
   * Accepts an incoming handshake request and computes the shared secret.
   * @param {HandshakeRequest} request - The incoming handshake payload.
   * @returns {Promise<void>}
   */
  const handleAcceptRequest = async (
    request: HandshakeRequest,
  ): Promise<void> => {
    console.log(
      "[ECDH PROOF] Computing Shared Secret from accepted request...",
    );
    computeSecret(request.from, request.ephemeralPublicKey);
    const peerAddress = request.from.toLowerCase();

    setInitiators((prev) => ({ ...prev, [peerAddress]: false }));

    if (socket) {
      console.log("[ECDH PROOF] Sending Handshake Response...");
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

  /**
   * Rejects an incoming handshake request and removes it from the pending list.
   * @param {string} requestAddress - The address of the peer to reject.
   * @returns {void}
   */
  const handleRejectRequest = (requestAddress: string): void => {
    setPendingRequests((prev) =>
      prev.filter((req) => req.from !== requestAddress),
    );
  };

  /**
   * Switches the active chat window to a different session.
   * @param {ActiveSession} session - The session to switch to.
   * @returns {void}
   */
  const switchChat = (session: ActiveSession): void => {
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
    isPeerTyping,
    setIsPeerTyping,
  };
};
