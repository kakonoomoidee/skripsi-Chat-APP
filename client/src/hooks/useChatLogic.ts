/// <reference types="vite/client" />
import { useState, useEffect } from "react";
import axios from "axios";
import { Socket } from "socket.io-client";

/**
 * Interface representing the properties required by the useChatLogic hook
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
 * Interface representing an incoming WebRTC handshake request
 */
export interface HandshakeRequest {
  from: string;
  ephemeralPublicKey: string;
  username?: string;
}

/**
 * 1. Manage peer-to-peer connection states, handshakes, and active chat sessions
 * @param {UseChatLogicProps} props - Dependencies including socket instance and cryptographic handlers
 * @returns {object} { targetUsername, setTargetUsername, activeChat, activeUsername, myUsername, pendingRequests, isSearching, handleConnectPeer, handleAcceptRequest, handleRejectRequest, isInitiator }
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
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isInitiator, setIsInitiator] = useState<boolean>(false);

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
  }, [socket, computeSecret, relayUrl]);

  /**
   * 2. Initiate connection to a peer by username via WebSocket signaling
   * @returns {Promise<void>}
   */
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
      setIsInitiator(true);

      if (!hasSecret(peerAddress) && socket) {
        socket.emit("handshake_init", {
          to: peerAddress,
          ephemeralPublicKey: ephemeralPublicKey,
        });
      }
      setTargetUsername("");
    } catch (err: unknown) {
      alert("Username not found on the network!");
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * 3. Accept incoming handshake request and establish shared secret
   * @param {HandshakeRequest} request - The incoming request payload
   * @returns {Promise<void>}
   */
  const handleAcceptRequest = async (request: HandshakeRequest) => {
    computeSecret(request.from, request.ephemeralPublicKey);
    setIsInitiator(false);

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
      } catch (err) {
        setActiveUsername("Unknown User");
      }
    }
  };

  /**
   * 4. Reject incoming handshake request
   * @param {string} requestAddress - The wallet address of the peer to reject
   * @returns {void}
   */
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
    isInitiator,
  };
};
