import { useState, useEffect, useRef, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/utils/db";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useCrypto } from "@/hooks/useCrypto";
import { useSocket } from "@/hooks/useSocket";
import { useChatLogic } from "@/hooks/useChatLogic";
import { shortenAddress, formatTime } from "@/utils/format";
import CryptoJS from "crypto-js";
import { ethers } from "ethers";

/**
 * 1. Main Chat Dashboard Component
 * Handles the UI for peer-to-peer messaging, handshake requests, and secure backups.
 * @returns {JSX.Element}
 */
export default function ChatDashboard() {
  const navigate = useNavigate();
  const { token, logout, isAuthenticated } = useAuth();
  const { address } = useWallet();
  const { socket, isConnected } = useSocket(token);
  const { ephemeralPublicKey, computeSecret, encrypt, decrypt, hasSecret } =
    useCrypto();

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

  const [messageInput, setMessageInput] = useState<string>("");
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  /**
   * 2. Handle sending an encrypted message
   * @param {FormEvent<HTMLFormElement>} e - The form submission event
   * @returns {Promise<void>}
   */
  const handleSendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      !messageInput.trim() ||
      !activeChat ||
      !hasSecret(activeChat) ||
      !socket
    )
      return;

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

  /**
   * 3. Export encrypted chat history with double validation (Password + Seed Phrase)
   * @returns {Promise<void>}
   */
  const handleExportChat = async () => {
    try {
      const password = prompt(
        "Step 1: Enter your Keystore password to authorize export:",
      );
      if (!password) return;

      const keystoreJson = localStorage.getItem("chat_app_keystore");
      if (!keystoreJson) return alert("Local identity not found!");

      let unlockedWallet: ethers.Wallet | ethers.HDNodeWallet;
      try {
        unlockedWallet = await ethers.Wallet.fromEncryptedJson(
          keystoreJson,
          password,
        );
      } catch {
        return alert("Export failed: Incorrect Keystore password!");
      }

      const seedPhraseInput = prompt(
        "Step 2: Enter your 12-word Seed Phrase to encrypt the backup:",
      );
      if (!seedPhraseInput) return;

      const words = seedPhraseInput.trim().split(/\s+/);
      if (words.length !== 12) {
        return alert(
          `Invalid! You entered ${words.length} words. A Seed Phrase must be exactly 12 words.`,
        );
      }

      try {
        const validationWallet = ethers.Wallet.fromPhrase(seedPhraseInput);
        if (validationWallet.address !== unlockedWallet.address) {
          return alert(
            "Security Alert: The Seed Phrase you entered does not match your current account!",
          );
        }
      } catch {
        return alert("Invalid Seed Phrase format or misspelled words!");
      }

      const allMessages = await db.messages.toArray();
      if (allMessages.length === 0) return alert("No chat history to export!");

      const jsonString = JSON.stringify(allMessages);
      const encryptedData = CryptoJS.AES.encrypt(
        jsonString,
        seedPhraseInput,
      ).toString();

      const blob = new Blob([encryptedData], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup_${shortenAddress(address || "")}.securep2p`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed! An unexpected error occurred.");
    }
  };

  /**
   * 4. Copy local wallet address to clipboard
   * @returns {void}
   */
  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex h-screen bg-zinc-950 font-sans antialiased selection:bg-indigo-500/30">
      <div className="w-80 bg-zinc-950/80 flex flex-col border-r border-zinc-800">
        <div className="p-6">
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight">
            Secure<span className="text-indigo-500">P2P</span>
          </h2>
          <div className="mt-6 bg-zinc-900 p-4 rounded-xl border border-zinc-800/80 shadow-sm">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 font-semibold">
              My Profile
            </p>
            <div className="flex justify-between items-center mb-1">
              <p className="font-semibold text-sm text-zinc-100 capitalize">
                {myUsername}
              </p>
              <button
                onClick={handleCopyAddress}
                className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded transition-colors"
              >
                {isCopied ? "Copied!" : "Copy Address"}
              </button>
            </div>
            <p className="font-mono text-[11px] text-emerald-400">
              {shortenAddress(address)}
            </p>

            <div className="flex items-center mt-4 pt-3 border-t border-zinc-800 gap-2 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500"}`}
              ></span>
              <span className="text-zinc-400 font-medium">
                {isConnected ? "Relay Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 pt-0 flex-1 overflow-y-auto custom-scrollbar">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
            Start New Session
          </label>
          <div className="flex bg-zinc-900 rounded-lg border border-zinc-800 focus-within:border-indigo-500 transition-colors mb-4">
            <input
              type="text"
              placeholder="Target username..."
              value={targetUsername}
              onChange={(e) => setTargetUsername(e.target.value)}
              className="w-full bg-transparent text-zinc-100 px-3 py-2.5 text-sm outline-none placeholder-zinc-600"
            />
          </div>
          <button
            onClick={handleConnectPeer}
            disabled={!targetUsername || isSearching}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/10 flex justify-center items-center"
          >
            {isSearching ? "Searching..." : "Connect & Handshake"}
          </button>

          {pendingRequests.length > 0 && (
            <div className="mt-8 border-t border-zinc-800 pt-6">
              <p className="text-xs font-semibold text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                Incoming Requests ({pendingRequests.length})
              </p>
              <div className="space-y-3">
                {pendingRequests.map((req, index) => (
                  <div
                    key={index}
                    className="bg-zinc-900 p-3.5 rounded-xl border border-amber-500/20 shadow-sm"
                  >
                    <p className="font-semibold text-sm text-zinc-100 capitalize truncate">
                      {req.username}
                    </p>
                    <p className="font-mono text-[10px] text-zinc-500 mb-3 truncate">
                      {shortenAddress(req.from)}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(req)}
                        className="flex-1 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 text-xs font-medium py-1.5 rounded-lg transition-colors border border-emerald-500/20"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req.from)}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-medium py-1.5 rounded-lg transition-colors"
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
            <div className="mt-8 p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/20">
              <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest mb-1">
                Active Session
              </p>
              <p className="font-semibold text-sm text-zinc-100 capitalize">
                {activeUsername || "Unknown"}
              </p>
              <p className="font-mono text-[11px] text-zinc-500 mt-0.5">
                {shortenAddress(activeChat)}
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium">
                {hasSecret(activeChat) ? (
                  <>
                    <svg
                      className="w-3.5 h-3.5 text-emerald-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    <span className="text-emerald-500">AES-256 Secured</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3.5 h-3.5 text-amber-500 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span className="text-amber-500">Negotiating Keys...</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-zinc-800 space-y-2.5">
          <button
            onClick={handleExportChat}
            className="w-full text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors border border-zinc-800/80"
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
            className="w-full text-xs font-medium text-red-400 hover:text-red-300 hover:bg-zinc-900 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
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

      <div className="flex-1 flex flex-col bg-zinc-950 relative">
        <div className="h-16 border-b border-zinc-800 flex items-center px-8 bg-zinc-950/80 backdrop-blur-md z-10 absolute top-0 w-full">
          {activeChat ? (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-linear-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-inner">
                {activeUsername ? activeUsername.charAt(0).toUpperCase() : "?"}
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100 capitalize">
                  {activeUsername || "Unknown User"}
                </h3>
                <p className="text-[11px] text-zinc-500 font-mono">
                  {activeChat}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-zinc-600 text-sm font-medium">
              No active session
            </p>
          )}
        </div>

        <div className="flex-1 p-8 pt-24 overflow-y-auto custom-scrollbar">
          {!activeChat ? (
            <div className="h-full flex items-center justify-center flex-col text-zinc-600">
              <div className="w-16 h-16 mb-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-zinc-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <p className="font-medium text-lg text-zinc-300 mb-1">
                SecureP2P Area
              </p>
              <p className="text-sm">
                Initiate a handshake from the sidebar to start.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[65%] px-5 py-3 shadow-sm ${
                      msg.isMine
                        ? "bg-indigo-600 text-zinc-50 rounded-2xl rounded-tr-sm"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-2xl rounded-tl-sm"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap warp-break-words">
                      {msg.text}
                    </p>
                    <p
                      className={`text-[10px] mt-2 font-medium ${msg.isMine ? "text-indigo-200 text-right" : "text-zinc-600"}`}
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
          <div className="p-6 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800 absolute bottom-0 w-full">
            <form
              onSubmit={handleSendMessage}
              className="flex gap-3 max-w-5xl mx-auto"
            >
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
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3.5 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 transition-all placeholder:text-zinc-600"
              />
              <button
                type="submit"
                disabled={!messageInput.trim() || !hasSecret(activeChat)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6 py-3.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
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
