import { useState, useEffect, useRef, FormEvent, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/utils/db";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useCrypto } from "@/hooks/useCrypto";
import { useSocket } from "@/hooks/useSocket";
import { useChatLogic } from "@/hooks/useChatLogic";
import { useRelay } from "@/hooks/useRelay";
import { useWebRTC } from "@/hooks/useWebRTC";
import { shortenAddress, formatTime } from "@/utils/format";

/**
 * 1. Main Chat Dashboard Component orchestrating UI, P2P communication, and node management.
 * @returns {JSX.Element}
 */
export default function ChatDashboard() {
  const navigate = useNavigate();
  const { token, logout, isAuthenticated } = useAuth();
  const { address } = useWallet();
  const { activeRelay, changeRelay, defaultRelays, addCustomRelay } =
    useRelay();
  const { socket, isConnected } = useSocket(token, activeRelay);
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
    isInitiator,
  } = useChatLogic({
    address,
    socket,
    ephemeralPublicKey,
    computeSecret,
    hasSecret,
    relayUrl: activeRelay,
  });

  const { isWebRTCConnected, sendDataViaWebRTC, initiateWebRTCConnection } =
    useWebRTC({
      socket,
      activeChat,
      decrypt,
    });

  const [messageInput, setMessageInput] = useState<string>("");
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const messages = useLiveQuery(
    () => {
      if (!activeChat) return [];
      return db.messages
        .where("chatId")
        .equals(activeChat || "")
        .sortBy("timestamp");
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

  useEffect(() => {
    if (
      activeChat &&
      hasSecret(activeChat) &&
      !isWebRTCConnected &&
      isInitiator
    ) {
      initiateWebRTCConnection();
    }
  }, [
    activeChat,
    initiateWebRTCConnection,
    hasSecret,
    isWebRTCConnected,
    isInitiator,
  ]);

  /**
   * 2. Encrypt and dispatch text message via direct WebRTC Data Channel.
   * @param {FormEvent<HTMLFormElement>} e - The form submission event.
   * @returns {Promise<void>}
   */
  const handleSendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const currentChat = activeChat as string;
    if (
      !messageInput.trim() ||
      !currentChat ||
      !hasSecret(currentChat) ||
      !isWebRTCConnected
    )
      return;

    try {
      const encryptedMsg = encrypt(currentChat, messageInput);
      sendDataViaWebRTC(encryptedMsg);
      await db.messages.add({
        chatId: currentChat,
        text: messageInput,
        isMine: true,
        timestamp: Date.now(),
      });
      setMessageInput("");
    } catch {
      alert("Failed to send message via P2P channel.");
    }
  };

  /**
   * 3. Handle image file selection, encryption, and P2P transmission.
   * @param {ChangeEvent<HTMLInputElement>} e - The file input change event.
   * @returns {Promise<void>}
   */
  const handleSendImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const currentChat = activeChat as string;
    if (!file || !currentChat || !isWebRTCConnected) return;

    if (file.size > 1024 * 500) {
      return alert("File too large for direct P2P transfer (Max 500KB).");
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const encryptedImage = encrypt(currentChat, base64);
        sendDataViaWebRTC(encryptedImage);
        await db.messages.add({
          chatId: currentChat,
          text: base64,
          isMine: true,
          timestamp: Date.now(),
          isImage: true,
        });
      } catch {
        alert("Image encryption failed.");
      }
    };
    reader.readAsDataURL(file);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  /**
   * 4. Prompt user for custom relay URL and save to local database.
   * @returns {void}
   */
  const handleAddNode = () => {
    const url = prompt(
      "Enter Custom Relay URL (e.g., http://192.168.1.10:3003):",
    );
    if (url) addCustomRelay(url);
  };

  /**
   * 5. Copy local wallet address to system clipboard.
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
              {shortenAddress(address || "")}
            </p>

            <div className="flex items-center mt-4 pt-3 border-t border-zinc-800 gap-2 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500"}`}
              ></span>
              <span className="text-zinc-400 font-medium">
                {isConnected ? "Relay Connected" : "Disconnected"}
              </span>
            </div>

            <div className="mt-4">
              <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">
                Network Node
              </label>
              <div className="flex gap-2">
                <select
                  value={activeRelay}
                  onChange={(e) => changeRelay(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-700 text-zinc-300 text-xs rounded px-2 py-1.5 outline-none cursor-pointer"
                >
                  {defaultRelays.map((url) => (
                    <option key={url} value={url}>
                      {url.replace("http://", "")}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddNode}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-1.5 rounded transition-colors border border-zinc-700"
                  title="Add Custom Node"
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 pt-0 flex-1 overflow-y-auto">
          {/* Peer Connection Section ... */}
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
            Start New Session
          </label>
          <div className="flex bg-zinc-900 rounded-lg border border-zinc-800 focus-within:border-indigo-500 mb-4">
            <input
              type="text"
              placeholder="Target username..."
              value={targetUsername}
              onChange={(e) => setTargetUsername(e.target.value)}
              className="w-full bg-transparent text-zinc-100 px-3 py-2.5 text-sm outline-none"
            />
          </div>
          <button
            onClick={handleConnectPeer}
            disabled={!targetUsername || isSearching}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50"
          >
            {isSearching ? "Searching..." : "Connect & Handshake"}
          </button>

          {/* Pending Requests ... */}
          {pendingRequests.length > 0 && (
            <div className="mt-8 border-t border-zinc-800 pt-6">
              <p className="text-xs font-semibold text-amber-500 uppercase tracking-widest mb-4">
                Incoming Requests ({pendingRequests.length})
              </p>
              {pendingRequests.map((req, index) => (
                <div
                  key={index}
                  className="bg-zinc-900 p-3.5 rounded-xl border border-amber-500/20 mb-3"
                >
                  <p className="font-semibold text-sm text-zinc-100 capitalize truncate">
                    {req.username}
                  </p>
                  <p className="font-mono text-[10px] text-zinc-500 mb-3">
                    {shortenAddress(req.from)}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptRequest(req)}
                      className="flex-1 bg-emerald-600/10 text-emerald-500 text-xs py-1.5 rounded-lg border border-emerald-500/20"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req.from)}
                      className="flex-1 bg-zinc-800 text-zinc-400 text-xs py-1.5 rounded-lg"
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeChat && (
            <div className="mt-8 p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/20">
              <p className="text-[10px] font-semibold text-indigo-400 uppercase mb-1">
                Active Session
              </p>
              <p className="font-semibold text-sm text-zinc-100 capitalize">
                {activeUsername || "Unknown"}
              </p>
              <p className="font-mono text-[11px] text-zinc-500 mt-0.5">
                {shortenAddress(activeChat || "")}
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-[11px]">
                {hasSecret(activeChat || "") ? (
                  <span className="text-emerald-500 font-bold">
                    AES-256 Secured
                  </span>
                ) : (
                  <span className="text-amber-500 animate-pulse font-bold">
                    Negotiating Keys...
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-zinc-800 flex flex-col gap-2.5">
          <input
            type="file"
            accept=".securep2p"
            ref={fileInputRef}
            className="hidden"
          />
          <div className="flex gap-2">
            <button className="flex-1 text-xs font-medium bg-zinc-900 text-indigo-400 py-2.5 rounded-lg border border-zinc-800/80">
              Import
            </button>
            <button className="flex-1 text-xs font-medium bg-zinc-900 text-zinc-300 py-2.5 rounded-lg border border-zinc-800/80">
              Export
            </button>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="w-full text-xs font-medium text-red-400 hover:bg-zinc-900 py-2.5 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-zinc-950 relative">
        <div className="h-16 border-b border-zinc-800 flex items-center px-8 bg-zinc-950/80 backdrop-blur-md z-10 absolute top-0 w-full">
          {activeChat ? (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                {activeUsername?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100 capitalize">
                  {activeUsername}
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

        <div className="flex-1 p-8 pt-24 pb-32 overflow-y-auto custom-scrollbar">
          {!activeChat ? (
            <div className="h-full flex items-center justify-center flex-col text-zinc-600">
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
                    className={`max-w-[65%] px-5 py-3 shadow-sm ${msg.isMine ? "bg-indigo-600 text-zinc-50 rounded-2xl rounded-tr-sm" : "bg-zinc-900 text-zinc-200 rounded-2xl rounded-tl-sm"}`}
                  >
                    {msg.isImage ? (
                      <img
                        src={msg.text}
                        alt="p2p-attachment"
                        className="rounded-lg max-w-full h-auto mb-2 border border-white/10"
                      />
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    )}
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
          <div className="p-6 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800 absolute bottom-0 w-full z-20">
            <form
              onSubmit={handleSendMessage}
              className="flex gap-3 max-w-5xl mx-auto items-center"
            >
              <input
                type="file"
                accept="image/*"
                ref={imageInputRef}
                onChange={handleSendImage}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={!isWebRTCConnected}
                className="p-3 text-zinc-400 hover:text-indigo-400 bg-zinc-900 rounded-xl border border-zinc-800 transition-colors disabled:opacity-50"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              </button>
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                disabled={!isWebRTCConnected}
                placeholder={
                  isWebRTCConnected
                    ? "Type an encrypted message..."
                    : "Establishing P2P Tunnel..."
                }
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3.5 text-sm text-zinc-100 outline-none focus:border-indigo-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!messageInput.trim() || !isWebRTCConnected}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6 py-3.5 text-sm font-medium transition-colors disabled:opacity-50 shadow-lg shadow-indigo-500/20"
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
