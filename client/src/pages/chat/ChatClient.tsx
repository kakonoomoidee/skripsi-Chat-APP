import React, { useState, useEffect, useRef, ChangeEvent } from "react";
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
 * 1. Main Chat Dashboard Component orchestrating UI, multi-tab P2P communication, and node management.
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
    activeSessions,
    switchChat,
    isSearching,
    initiators,
    handleConnectPeer,
    handleAcceptRequest,
    handleRejectRequest,
  } = useChatLogic({
    address,
    socket,
    ephemeralPublicKey,
    computeSecret,
    hasSecret,
    relayUrl: activeRelay,
  });

  const {
    isWebRTCConnected,
    sendDataViaWebRTC,
    initiateWebRTCConnection,
    connectedPeers,
  } = useWebRTC({
    socket,
    myAddress: address,
    activeChat,
    decrypt,
  });

  const [messageInput, setMessageInput] = useState<string>("");
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"sessions" | "requests">(
    "sessions",
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const webrtcInitiated = useRef<{ [addr: string]: boolean }>({});

  const messages = useLiveQuery(
    () => {
      if (!activeChat || !address) return [];
      return db.messages
        .where({
          ownerAddress: address.toLowerCase(),
          chatId: activeChat.toLowerCase(),
        })
        .sortBy("timestamp");
    },
    [activeChat, address],
    [],
  );

  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const current = activeChat?.toLowerCase();
    if (current && !connectedPeers.includes(current)) {
      webrtcInitiated.current[current] = false;
    }
  }, [activeChat, connectedPeers]);

  useEffect(() => {
    const current = activeChat?.toLowerCase();
    if (
      current &&
      hasSecret(current) &&
      !connectedPeers.includes(current) &&
      initiators[current] === true
    ) {
      if (!webrtcInitiated.current[current]) {
        webrtcInitiated.current[current] = true;
        setTimeout(() => {
          initiateWebRTCConnection(current);
        }, 1000);
      }
    }
  }, [
    activeChat,
    initiateWebRTCConnection,
    hasSecret,
    connectedPeers,
    initiators,
  ]);

  const handleSendMessage = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const currentChat = activeChat as string;
    if (
      !messageInput.trim() ||
      !currentChat ||
      !hasSecret(currentChat) ||
      !isWebRTCConnected ||
      !address
    )
      return;

    try {
      const encryptedMsg = encrypt(currentChat, messageInput);
      sendDataViaWebRTC(currentChat, encryptedMsg);
      await db.messages.add({
        ownerAddress: address.toLowerCase(),
        chatId: currentChat.toLowerCase(),
        text: messageInput,
        isMine: true,
        timestamp: Date.now(),
      });
      setMessageInput("");
    } catch {
      alert("Failed to send message. Is WebRTC connected?");
    }
  };

  const handleSendImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const currentChat = activeChat as string;
    if (!file || !currentChat || !isWebRTCConnected || !address) return;

    if (file.size > 1024 * 500) {
      alert("File too large! Max 500KB for P2P demo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const encryptedImage = encrypt(currentChat, base64);
        sendDataViaWebRTC(currentChat, encryptedImage);

        await db.messages.add({
          ownerAddress: address.toLowerCase(),
          chatId: currentChat.toLowerCase(),
          text: base64,
          isMine: true,
          timestamp: Date.now(),
          isImage: true,
        });
      } catch {
        alert("Encryption failed.");
      }
    };
    reader.readAsDataURL(file);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex h-screen bg-zinc-950 font-sans antialiased selection:bg-indigo-500/30">
      <div className="w-80 bg-zinc-950/80 flex flex-col border-r border-zinc-800">
        <div className="p-6 pb-4">
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight">
            Secure<span className="text-indigo-500">P2P</span>
          </h2>
          <div className="mt-4 bg-zinc-900 p-4 rounded-xl border border-zinc-800/80 shadow-sm">
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
            <div className="flex items-center mt-3 pt-3 border-t border-zinc-800 gap-2 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500"}`}
              ></span>
              <span className="text-zinc-400 font-medium">
                {isConnected ? "Relay Connected" : "Disconnected"}
              </span>
            </div>
            <div className="mt-3">
              <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">
                Network Node
              </label>
              <div className="flex gap-2">
                <select
                  value={activeRelay}
                  onChange={(e) => changeRelay(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-700 text-zinc-300 text-xs rounded px-2 py-1.5 outline-none cursor-pointer"
                >
                  {defaultRelays.map((url: string) => (
                    <option key={url} value={url}>
                      {url.replace("http://", "")}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const u = prompt("Relay URL:");
                    if (u) addCustomRelay(u);
                  }}
                  className="px-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-indigo-400 rounded-lg transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 flex gap-2 border-b border-zinc-800 mb-2">
          <button
            onClick={() => setActiveTab("sessions")}
            className={`pb-2 text-xs font-semibold uppercase tracking-widest transition-colors ${activeTab === "sessions" ? "text-indigo-400 border-b-2 border-indigo-400" : "text-zinc-600 hover:text-zinc-400"}`}
          >
            Sessions ({activeSessions.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`pb-2 text-xs font-semibold uppercase tracking-widest transition-colors flex items-center gap-1 ${activeTab === "requests" ? "text-amber-400 border-b-2 border-amber-400" : "text-zinc-600 hover:text-zinc-400"}`}
          >
            Requests
            {pendingRequests.length > 0 && (
              <span className="bg-amber-500 text-zinc-950 rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        <div className="p-6 pt-2 flex-1 overflow-y-auto">
          {activeTab === "requests" ? (
            <>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 mt-2">
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

              {pendingRequests.length > 0 ? (
                <div className="mt-6">
                  {pendingRequests.map((req, index) => (
                    <div
                      key={index}
                      className="bg-zinc-900 p-3.5 rounded-xl border border-amber-500/20 mb-3"
                    >
                      <p className="font-semibold text-sm text-zinc-100 capitalize truncate">
                        {req.username}
                      </p>
                      <p className="font-mono text-[10px] text-zinc-500 mb-3 truncate">
                        {shortenAddress(req.from)}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            handleAcceptRequest(req);
                            setActiveTab("sessions");
                          }}
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
              ) : (
                <p className="text-zinc-600 text-xs text-center mt-8">
                  No pending requests.
                </p>
              )}
            </>
          ) : (
            <div className="space-y-2 mt-2">
              {activeSessions.length > 0 ? (
                activeSessions.map((session) => (
                  <div
                    key={session.address}
                    onClick={() => switchChat(session)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${activeChat === session.address ? "bg-indigo-500/10 border-indigo-500/30" : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"}`}
                  >
                    <div>
                      <p className="font-semibold text-sm text-zinc-100 capitalize">
                        {session.username}
                      </p>
                      <p className="font-mono text-[10px] text-zinc-500">
                        {shortenAddress(session.address)}
                      </p>
                    </div>
                    <div
                      className={`w-2 h-2 rounded-full ${connectedPeers.includes(session.address.toLowerCase()) ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}
                    ></div>
                  </div>
                ))
              ) : (
                <p className="text-zinc-600 text-xs text-center mt-8">
                  No active chats. Start one in the Requests tab.
                </p>
              )}
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
            <button className="flex-1 text-xs font-medium bg-zinc-900 text-zinc-400 py-2 rounded-lg border border-zinc-800/80">
              Import
            </button>
            <button className="flex-1 text-xs font-medium bg-zinc-900 text-zinc-400 py-2 rounded-lg border border-zinc-800/80">
              Export
            </button>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="w-full text-xs font-medium text-red-400 hover:bg-zinc-900 py-2 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-zinc-950 relative">
        <div className="h-16 border-b border-zinc-800 flex items-center px-8 bg-zinc-950/80 backdrop-blur-md z-10 absolute top-0 w-full">
          {activeChat ? (
            <div className="flex items-center justify-between w-full">
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
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
                {isWebRTCConnected ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-[10px] text-emerald-500 font-medium">
                      Secured Tunnel
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    <span className="text-[10px] text-amber-500 font-medium">
                      Negotiating
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <p className="text-zinc-600 text-sm font-medium">
              Select a chat from the sidebar
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
                Select an active session or accept a request to start.
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
                      <p className="text-sm leading-relaxed whitespace-pre-wrap warp-break-words">
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
                    ? `Message ${activeUsername}...`
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
