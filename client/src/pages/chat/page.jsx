import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../utils/db";
import { useAuth } from "../../hooks/useAuth";
import { useWallet } from "../../hooks/useWallet";
import { useCrypto } from "../../hooks/useCrypto";
import { useSocket } from "../../hooks/useSocket";
import { useChatLogic } from "../../hooks/useChatLogic"; // FIX: Import Custom Hook
import { shortenAddress, formatTime } from "../../utils/format";
import CryptoJS from "crypto-js";
import { ethers } from "ethers";

export default function ChatDashboard() {
  const navigate = useNavigate();
  const { token, logout, isAuthenticated } = useAuth();
  const { address, wallet } = useWallet();
  const { socket, isConnected } = useSocket(token);
  const { ephemeralPublicKey, computeSecret, encrypt, decrypt, hasSecret } =
    useCrypto();

  // FIX: Tarik semua state dan logic dari custom hook
  const {
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
  } = useChatLogic({
    address,
    socket,
    ephemeralPublicKey,
    computeSecret,
    decrypt,
    hasSecret,
  });

  const [messageInput, setMessageInput] = useState("");
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
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    } catch {
      alert("Failed to encrypt message. Is handshake complete?");
    }
  };

  const handleExportChat = async () => {
    try {
      let backupKey = wallet?.privateKey;
      if (!backupKey) {
        const password = prompt(
          "Enter your encryption password to export chat backup:",
        );
        if (!password) return;

        const keystoreJson = localStorage.getItem("chat_app_keystore");
        if (!keystoreJson) return alert("Local identity not found!");

        const unlockedWallet = await ethers.Wallet.fromEncryptedJson(
          keystoreJson,
          password,
        );
        backupKey = unlockedWallet.privateKey;
      }

      const allMessages = await db.messages.toArray();
      if (allMessages.length === 0) return alert("No chat history to export!");

      const jsonString = JSON.stringify(allMessages);
      const encryptedData = CryptoJS.AES.encrypt(
        jsonString,
        backupKey,
      ).toString();

      const blob = new Blob([encryptedData], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup_${shortenAddress(address)}.securep2p`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed! Incorrect password or corrupted data.");
    }
  };

  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <div className="w-80 bg-slate-900 flex flex-col border-r border-slate-800">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Secure<span className="text-blue-400">P2P</span>
          </h2>
          <div className="mt-4 bg-slate-800 p-4 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">
              My Profile
            </p>
            <div className="flex justify-between items-center mb-1">
              <p className="font-bold text-sm text-white capitalize">
                {myUsername}
              </p>
              <button
                onClick={handleCopyAddress}
                className="text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded transition-colors"
              >
                {isCopied ? "Copied!" : "Copy Address"}
              </button>
            </div>
            <p className="font-mono text-xs text-green-400">
              {shortenAddress(address)}
            </p>

            <div className="flex items-center mt-4 pt-3 border-t border-slate-700 gap-2 text-xs">
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
            Start Chat with Username:
          </label>
          <input
            type="text"
            placeholder="e.g. satoshi"
            value={targetUsername}
            onChange={(e) => setTargetUsername(e.target.value)}
            className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors mb-3"
          />
          <button
            onClick={handleConnectPeer}
            disabled={!targetUsername || isSearching}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex justify-center items-center"
          >
            {isSearching ? "Searching..." : "Connect & Handshake"}
          </button>

          {pendingRequests.length > 0 && (
            <div className="mt-6 border-t border-slate-700 pt-4">
              <p className="text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-3">
                Incoming Requests ({pendingRequests.length})
              </p>
              <div className="space-y-2">
                {pendingRequests.map((req, index) => (
                  <div
                    key={index}
                    className="bg-slate-800 p-3 rounded-lg border border-yellow-500/30"
                  >
                    <p className="font-bold text-sm text-white capitalize truncate">
                      {req.username}
                    </p>
                    <p className="font-mono text-[10px] text-slate-400 mb-2 truncate">
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
              <p className="font-semibold text-sm text-white mt-1 capitalize">
                {activeUsername || "Unknown"}
              </p>
              <p className="font-mono text-xs text-blue-400 mt-1">
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

        <div className="p-4 border-t border-slate-800 space-y-2">
          <button
            onClick={handleExportChat}
            className="w-full text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors border border-slate-700"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Export Backup
          </button>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="w-full text-sm text-red-400 hover:text-red-300 hover:bg-slate-800 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Sign Out
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        <div className="h-16 border-b border-gray-200 flex items-center px-6 bg-slate-50">
          {activeChat ? (
            <div>
              <h3 className="font-bold text-gray-800 text-lg capitalize">
                {activeUsername || "Unknown User"}
              </h3>
              <p className="text-xs text-gray-500 font-mono">
                {activeChat} •{" "}
                {hasSecret(activeChat)
                  ? "End-to-End Encrypted"
                  : "Waiting for peer..."}
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
                Enter a username on the left to start chatting securely.
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
