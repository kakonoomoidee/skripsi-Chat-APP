import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../utils/db";
import { useAuth } from "../../hooks/useAuth";
import { useWallet } from "../../hooks/useWallet";
import { useCrypto } from "../../hooks/useCrypto";
import { useSocket } from "../../hooks/useSocket";
import { shortenAddress, formatTime } from "../../utils/format";

export default function ChatDashboard() {
  const navigate = useNavigate();
  const { token, logout, isAuthenticated } = useAuth();
  const { address } = useWallet();
  const { socket, isConnected } = useSocket(token);
  const { ephemeralPublicKey, computeSecret, encrypt, decrypt, hasSecret } =
    useCrypto();

  const [targetAddress, setTargetAddress] = useState("");
  const [activeChat, setActiveChat] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isCopied, setIsCopied] = useState(false);

  const messagesEndRef = useRef(null);

  const messages = useLiveQuery(
    () => {
      if (!activeChat) return [];
      return db.messages.where("chatId").equals(activeChat).sortBy("timestamp");
    },
    [activeChat],
    [],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    const onHandshakeOffer = (data) => {
      console.log("Incoming Handshake Offer from:", data.from);
      setPendingRequests((prev) => {
        if (prev.find((req) => req.from === data.from)) return prev;
        return [...prev, data];
      });
    };

    const onHandshakeAnswer = (data) => {
      console.log("Handshake Answer received from:", data.from);
      computeSecret(data.from, data.ephemeralPublicKey);
    };

    const onReceiveMessage = async (data) => {
      console.log("Encrypted message received");
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

  const handleConnectPeer = () => {
    if (!targetAddress || targetAddress === address) return;
    setActiveChat(targetAddress);
    if (!hasSecret(targetAddress)) {
      socket.emit("handshake_init", {
        to: targetAddress,
        ephemeralPublicKey: ephemeralPublicKey,
      });
    }
  };

  const handleAcceptRequest = (request) => {
    computeSecret(request.from, request.ephemeralPublicKey);
    socket.emit("handshake_response", {
      to: request.from,
      ephemeralPublicKey: ephemeralPublicKey,
    });
    setPendingRequests((prev) =>
      prev.filter((req) => req.from !== request.from),
    );
    setActiveChat(request.from);
  };

  const handleRejectRequest = (requestAddress) => {
    setPendingRequests((prev) =>
      prev.filter((req) => req.from !== requestAddress),
    );
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChat || !hasSecret(activeChat)) return;

    try {
      const encryptedMsg = encrypt(activeChat, messageInput);
      const timestamp = Date.now();

      socket.emit("send_message", {
        to: activeChat,
        encryptedMessage: encryptedMsg,
      });

      await db.messages.add({
        chatId: activeChat,
        text: messageInput,
        isMine: true,
        timestamp: timestamp,
      });

      setMessageInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to encrypt message. Is handshake complete?");
    }
  };

  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <div className="w-80 bg-slate-900 flex flex-col border-r border-slate-800">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Secure<span className="text-blue-400">P2P</span>
          </h2>
          <div className="mt-4 bg-slate-800 p-3 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
              My Address
            </p>
            <div className="flex justify-between items-center">
              <p className="font-mono text-sm text-green-400">
                {shortenAddress(address)}
              </p>
              <button
                onClick={handleCopyAddress}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded transition-colors"
              >
                {isCopied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="flex items-center mt-3 gap-2 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
              ></span>
              <span className="text-slate-300">
                {isConnected ? "Relay Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Start Chat with Address:
          </label>
          <input
            type="text"
            placeholder="0x..."
            value={targetAddress}
            onChange={(e) => setTargetAddress(e.target.value)}
            className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors mb-3 font-mono"
          />
          <button
            onClick={handleConnectPeer}
            disabled={!targetAddress}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            Connect & Handshake
          </button>

          {pendingRequests.length > 0 && (
            <div className="mt-6 border-t border-slate-700 pt-4">
              <p className="text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-3">
                Incoming Connections ({pendingRequests.length})
              </p>
              <div className="space-y-2">
                {pendingRequests.map((req, index) => (
                  <div
                    key={index}
                    className="bg-slate-800 p-3 rounded-lg border border-yellow-500/30"
                  >
                    <p className="font-mono text-xs text-slate-300 mb-2 truncate">
                      {shortenAddress(req.from)}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(req)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-1.5 rounded transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req.from)}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs py-1.5 rounded transition-colors"
                      >
                        Ignore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeChat && (
            <div className="mt-6 p-3 bg-slate-800 rounded-lg border border-slate-700">
              <p className="text-xs text-slate-400">Active Session:</p>
              <p className="font-mono text-sm text-blue-400 mt-1">
                {shortenAddress(activeChat)}
              </p>
              <p className="text-xs mt-2 flex items-center gap-1">
                <span className="text-slate-400">Encryption:</span>
                {hasSecret(activeChat) ? (
                  <span className="text-green-400 font-medium">Secured</span>
                ) : (
                  <span className="text-yellow-400 font-medium">
                    Negotiating...
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full text-sm text-slate-400 hover:text-white flex items-center justify-center gap-2 transition-colors"
          >
            Sign Out Session
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        <div className="h-16 border-b border-gray-200 flex items-center px-6 bg-slate-50">
          {activeChat ? (
            <div>
              <h3 className="font-semibold text-gray-800 font-mono">
                {activeChat}
              </h3>
              <p className="text-xs text-gray-500">
                {hasSecret(activeChat)
                  ? "End-to-End Encrypted"
                  : "Waiting for peer to come online..."}
              </p>
            </div>
          ) : (
            <p className="text-gray-500 italic">No active session</p>
          )}
        </div>

        <div className="flex-1 p-6 overflow-y-auto bg-slate-50">
          {!activeChat ? (
            <div className="h-full flex items-center justify-center flex-col text-gray-400">
              <p className="font-medium text-lg mb-2">Welcome to SecureP2P</p>
              <p className="text-sm">
                Enter a wallet address on the left to start chatting securely.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-5 py-3 ${
                      msg.isMine
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-white border border-gray-200 text-gray-800 shadow-sm rounded-bl-none"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <p
                      className={`text-[10px] mt-1 ${msg.isMine ? "text-blue-200 text-right" : "text-gray-400"}`}
                    >
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {activeChat && (
          <div className="p-4 bg-white border-t border-gray-200">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                disabled={!hasSecret(activeChat)}
                placeholder={
                  hasSecret(activeChat)
                    ? "Type an encrypted message..."
                    : "Waiting for secure connection..."
                }
                className="flex-1 bg-slate-100 border-none rounded-full px-6 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!messageInput.trim() || !hasSecret(activeChat)}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
