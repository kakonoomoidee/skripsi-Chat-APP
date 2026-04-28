import { useState, useEffect, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";
import { db } from "@/utils/storage/db";
import { getAddressByUsername, getUsernameByAddress } from "@/services/api";
import {
  useChatStore,
  HandshakeRequest,
  ActiveSession,
} from "@/store/useChatStore";

/**
 * Interface defining the dependencies required by the useChatLogic hook.
 */
export interface UseChatLogicProps {
  address: string | null;
  socket: Socket | null;
  generateHandshakeKeys: (peerAddress: string) => string;
  computeSecret: (peerAddress: string, peerPublicKey: string) => void;
  hasSecret: (peerAddress: string) => boolean;
  relayUrl: string;
  removeSecret: (addr: string) => void;
  forceDisconnectPeer?: (addr: string) => void;
  onHandshakeComplete?: (peerAddress: string) => void;
}

/**
 * Custom hook to manage chat sessions, handle peer discovery, and coordinate
 * cryptographic handshakes via Socket.IO.
 *
 * The ECDH handshake is intentionally decoupled from peer discovery. Callers
 * are responsible for invoking initiateHandshake only after confirming the
 * peer is reachable (e.g. after a successful ping/pong exchange). This prevents
 * key material from being generated for peers that are offline.
 *
 * @param {UseChatLogicProps} props - Dependencies including socket instance and crypto functions.
 * @returns {object} Chat session states and handler functions.
 */
export const useChatLogic = ({
  address,
  socket,
  generateHandshakeKeys,
  computeSecret,
  relayUrl,
  removeSecret,
  forceDisconnectPeer,
  onHandshakeComplete,
}: UseChatLogicProps) => {
  const [targetUsername, setTargetUsername] = useState<string>("");
  const [myUsername, setMyUsername] = useState<string>("Loading...");

  const {
    activeChat,
    setActiveChat,
    setActiveUsername,
    activeSessions,
    setActiveSessions,
    setPendingRequests,
    setIsSearching,
    setInitiators,
    setSearchError,
  } = useChatStore();

  const activeSessionsRef = useRef<ActiveSession[]>([]);
  const activeChatRef = useRef<string | null>(null);

  const onHandshakeCompleteRef = useRef<((addr: string) => void) | undefined>(
    undefined,
  );

  const upsertActiveSession = useCallback(
    (session: ActiveSession): void => {
      setActiveSessions((prev) => {
        if (prev.find((item) => item.address === session.address)) {
          return prev;
        }

        return [...prev, session];
      });
    },
    [setActiveSessions],
  );

  const setPeerInitiator = useCallback(
    (peerAddress: string, isInitiator: boolean): void => {
      setInitiators((prev) => ({ ...prev, [peerAddress]: isInitiator }));
    },
    [setInitiators],
  );

  useEffect(() => {
    onHandshakeCompleteRef.current = onHandshakeComplete;
  }, [onHandshakeComplete]);

  useEffect(() => {
    activeSessionsRef.current = activeSessions;
  }, [activeSessions]);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const closeChat = useCallback((): void => {
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
      getUsernameByAddress(relayUrl, address)
        .then((username) => setMyUsername(username))
        .catch(() => setMyUsername("Unknown Profile"));
    }
  }, [address, relayUrl]);

  useEffect(() => {
    if (!socket) return;

    /**
     * Handles an incoming ECDH handshake offer from a remote peer.
     *
     * If the sender is blocked the offer is silently dropped. For existing
     * sessions the current WebRTC connection is torn down before re-keying
     * so the new data channel can be established cleanly. The receiver always
     * responds immediately with its own ephemeral key.
     *
     * @param {{ from: string; ephemeralPublicKey: string }} data - Offer payload.
     * @returns {Promise<void>}
     */
    const onHandshakeOffer = async (data: {
      from: string;
      ephemeralPublicKey: string;
    }): Promise<void> => {
      const peerAddress = data.from.toLowerCase();

      const contactRecord = await db.contacts.get(peerAddress);
      if (contactRecord?.status === "blocked") return;

      const existingSession = activeSessionsRef.current.find(
        (s) => s.address === peerAddress,
      );

      if (existingSession) {
        if (forceDisconnectPeer) forceDisconnectPeer(peerAddress);

        const myNewPubKey = generateHandshakeKeys(peerAddress);
        computeSecret(peerAddress, data.ephemeralPublicKey);

        socket.emit("handshake_response", {
          to: peerAddress,
          ephemeralPublicKey: myNewPubKey,
        });

        setPeerInitiator(peerAddress, false);
        return;
      }

      let incomingUser = "Unknown";
      try {
        incomingUser = await getUsernameByAddress(relayUrl, data.from);
      } catch {
        incomingUser = "Unknown";
      }

      const myNewPubKey = generateHandshakeKeys(peerAddress);
      computeSecret(peerAddress, data.ephemeralPublicKey);

      socket.emit("handshake_response", {
        to: peerAddress,
        ephemeralPublicKey: myNewPubKey,
      });

      upsertActiveSession({ address: peerAddress, username: incomingUser });

      setPeerInitiator(peerAddress, false);

      await db.contacts.put({
        address: peerAddress,
        status: contactRecord?.status ?? "pending",
        isArchived: contactRecord?.isArchived ?? false,
        username: incomingUser,
      });
    };

    /**
     * Handles the ECDH handshake answer from a peer, completing the shared-secret
     * derivation on the initiator side. Invokes onHandshakeComplete so the caller
     * can proceed to initiate the WebRTC data channel.
     *
     * @param {{ from: string; ephemeralPublicKey: string }} data - Answer payload.
     * @returns {void}
     */
    const onHandshakeAnswer = (data: {
      from: string;
      ephemeralPublicKey: string;
    }): void => {
      const peerAddress = data.from.toLowerCase();
      computeSecret(peerAddress, data.ephemeralPublicKey);
      if (onHandshakeCompleteRef.current) {
        onHandshakeCompleteRef.current(peerAddress);
      }
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
    setPeerInitiator,
    upsertActiveSession,
  ]);

  /**
   * Sends an ECDH handshake initiation to a peer via the relay. This must only
   * be called after the peer has been confirmed reachable via a ping/pong probe.
   * It does not start WebRTC negotiation — that happens in onHandshakeComplete.
   *
   * @param {string} peerAddress - Lowercase wallet address of the target peer.
   * @returns {void}
   */
  const initiateHandshake = useCallback(
    (peerAddress: string): void => {
      if (!socket) return;
      const addr = peerAddress.toLowerCase();
      const myNewPubKey = generateHandshakeKeys(addr);
      socket.emit("handshake_init", {
        to: addr,
        ephemeralPublicKey: myNewPubKey,
      });
    },
    [socket, generateHandshakeKeys],
  );

  /**
   * Resolves a username to a wallet address, adds the peer to the active session
   * list, opens the chat panel, and marks this client as the initiator. It does
   * NOT perform the ECDH handshake — that is deferred until after a successful
   * ping/pong confirms the peer is online.
   *
   * @returns {Promise<void>}
   */
  const handleConnectPeer = async (): Promise<void> => {
    if (!targetUsername.trim()) return;

    setIsSearching(true);
    setSearchError("");

    try {
      const normalizedUsername = targetUsername.trim();
      const peerAddress = (
        await getAddressByUsername(relayUrl, normalizedUsername)
      ).toLowerCase();

      if (address && peerAddress === address.toLowerCase()) {
        setSearchError("Cannot chat with yourself.");
        setIsSearching(false);
        return;
      }

      upsertActiveSession({
        address: peerAddress,
        username: normalizedUsername,
      });

      setActiveChat(peerAddress);
      setActiveUsername(normalizedUsername);
      setPeerInitiator(peerAddress, true);

      setTargetUsername("");
    } catch {
      setSearchError("Username not found on the network.");
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Completes a pending connection request by finalising the ECDH key exchange,
   * responding to the peer, and opening the chat panel for the requester.
   *
   * @param {HandshakeRequest} request - The pending handshake offer to accept.
   * @returns {Promise<void>}
   */
  const handleAcceptRequest = async (
    request: HandshakeRequest,
  ): Promise<void> => {
    const peerAddress = request.from.toLowerCase();
    const myNewPubKey = generateHandshakeKeys(peerAddress);

    computeSecret(peerAddress, request.ephemeralPublicKey);
    setPeerInitiator(peerAddress, false);

    if (socket) {
      socket.emit("handshake_response", {
        to: peerAddress,
        ephemeralPublicKey: myNewPubKey,
      });
    }

    setPendingRequests((prev: HandshakeRequest[]) =>
      prev.filter((req: HandshakeRequest) => req.from !== request.from),
    );

    const finalUsername =
      request.username && request.username !== "Unknown"
        ? request.username
        : "Unknown User";

    upsertActiveSession({ address: request.from, username: finalUsername });

    setActiveChat(request.from);
    setActiveUsername(finalUsername);
  };

  /**
   * Removes a pending connection request without accepting it.
   *
   * @param {string} requestAddress - The wallet address of the peer to reject.
   * @returns {void}
   */
  const handleRejectRequest = (requestAddress: string): void => {
    setPendingRequests((prev: HandshakeRequest[]) =>
      prev.filter((req: HandshakeRequest) => req.from !== requestAddress),
    );
  };

  /**
   * Sets the given session as the active chat.
   *
   * @param {ActiveSession} session - The session to switch to.
   * @returns {void}
   */
  const switchChat = (session: ActiveSession): void => {
    setActiveChat(session.address);
    setActiveUsername(session.username);
  };

  /**
   * Removes a peer from the active session list, clears their initiator flag
   * and shared secret, and closes the chat panel if it was currently open.
   *
   * @param {string} peerAddress - Wallet address of the peer to remove.
   * @returns {void}
   */
  const removeActiveSession = useCallback(
    (peerAddress: string): void => {
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

  /**
   * Marks a contact as 'accepted' in the local database.
   *
   * @param {string} peerAddress - Lowercase wallet address of the peer.
   * @returns {Promise<void>}
   */
  const acceptContact = useCallback(
    async (peerAddress: string): Promise<void> => {
      const addr = peerAddress.toLowerCase();
      const existing = await db.contacts.get(addr);
      await db.contacts.put({
        address: addr,
        status: "accepted",
        isArchived: existing?.isArchived ?? false,
        username: existing?.username,
      });
    },
    [],
  );

  /**
   * Marks a contact as 'blocked' in the local database.
   *
   * @param {string} peerAddress - Lowercase wallet address of the peer.
   * @returns {Promise<void>}
   */
  const blockContact = useCallback(
    async (peerAddress: string): Promise<void> => {
      const addr = peerAddress.toLowerCase();
      const existing = await db.contacts.get(addr);
      await db.contacts.put({
        address: addr,
        status: "blocked",
        isArchived: existing?.isArchived ?? false,
        username: existing?.username,
      });
    },
    [],
  );

  /**
   * Moves a contact to the archived list by setting isArchived to true.
   *
   * @param {string} peerAddress - Lowercase wallet address of the peer.
   * @returns {Promise<void>}
   */
  const archiveContact = useCallback(
    async (peerAddress: string): Promise<void> => {
      const addr = peerAddress.toLowerCase();
      const existing = await db.contacts.get(addr);
      await db.contacts.put({
        address: addr,
        status: existing?.status ?? "accepted",
        isArchived: true,
        username: existing?.username,
      });
    },
    [],
  );

  /**
   * Moves a contact back to the main list by setting isArchived to false.
   *
   * @param {string} peerAddress - Lowercase wallet address of the peer.
   * @returns {Promise<void>}
   */
  const unarchiveContact = useCallback(
    async (peerAddress: string): Promise<void> => {
      const addr = peerAddress.toLowerCase();
      const existing = await db.contacts.get(addr);
      await db.contacts.put({
        address: addr,
        status: existing?.status ?? "accepted",
        isArchived: false,
        username: existing?.username,
      });
    },
    [],
  );

  return {
    targetUsername,
    setTargetUsername,
    myUsername,
    switchChat,
    closeChat,
    handleConnectPeer,
    handleAcceptRequest,
    handleRejectRequest,
    initiateHandshake,
    removeActiveSession,
    acceptContact,
    blockContact,
    archiveContact,
    unarchiveContact,
  };
};
