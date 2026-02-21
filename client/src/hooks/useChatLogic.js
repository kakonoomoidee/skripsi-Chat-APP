import { useState, useEffect } from "react";
import axios from "axios";
import { db } from "../utils/db";

const API_URL = import.meta.env.VITE_API_URL;

export const useChatLogic = ({
  address,
  socket,
  ephemeralPublicKey,
  computeSecret,
  decrypt,
  hasSecret,
}) => {
  const [targetUsername, setTargetUsername] = useState("");
  const [activeChat, setActiveChat] = useState(null);
  const [activeUsername, setActiveUsername] = useState("");
  const [myUsername, setMyUsername] = useState("Loading...");
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (address) {
      axios
        .get(`${API_URL}/auth/user/${address}`)
        .then((res) => setMyUsername(res.data.username))
        .catch(() => setMyUsername("Unknown Profile"));
    }
  }, [address]);

  useEffect(() => {
    if (!socket) return;

    const onHandshakeOffer = async (data) => {
      let incomingUser = "Unknown";
      try {
        const res = await axios.get(`${API_URL}/auth/user/${data.from}`);
        incomingUser = res.data.username;
      } catch (err) {
        // FIX: Rename 'error' to 'err' and log it to avoid linter warning
        console.error("Failed to fetch peer username:", err.message);
      }

      setPendingRequests((prev) => {
        if (prev.find((req) => req.from === data.from)) return prev;
        return [...prev, { ...data, username: incomingUser }];
      });
    };

    const onHandshakeAnswer = (data) => {
      computeSecret(data.from, data.ephemeralPublicKey);
    };

    const onReceiveMessage = async (data) => {
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
  }, [socket, computeSecret, decrypt]);

  const handleConnectPeer = async () => {
    if (!targetUsername.trim()) return;
    setIsSearching(true);
    try {
      const res = await axios.get(
        `${API_URL}/auth/address/${targetUsername.trim()}`,
      );
      const peerAddress = res.data.address.toLowerCase();

      if (peerAddress === address.toLowerCase()) {
        alert("Cannot chat with yourself!");
        setIsSearching(false);
        return;
      }

      setActiveChat(peerAddress);
      setActiveUsername(targetUsername.trim());

      if (!hasSecret(peerAddress)) {
        socket.emit("handshake_init", {
          to: peerAddress,
          ephemeralPublicKey: ephemeralPublicKey,
        });
      }
      setTargetUsername("");
    } catch (err) {
      alert(err.response?.data?.error || "Username not found on the network!");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAcceptRequest = async (request) => {
    computeSecret(request.from, request.ephemeralPublicKey);
    socket.emit("handshake_response", {
      to: request.from,
      ephemeralPublicKey: ephemeralPublicKey,
    });
    setPendingRequests((prev) =>
      prev.filter((req) => req.from !== request.from),
    );

    setActiveChat(request.from);

    if (request.username && request.username !== "Unknown") {
      setActiveUsername(request.username);
    } else {
      try {
        const res = await axios.get(`${API_URL}/auth/user/${request.from}`);
        setActiveUsername(res.data.username);
      } catch (err) {
        console.warn("User info fetch failed:", err.message); // FIX: using 'err'
        setActiveUsername("Unknown User");
      }
    }
  };

  const handleRejectRequest = (requestAddress) => {
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
