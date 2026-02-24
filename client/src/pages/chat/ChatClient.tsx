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
import { formatTime, shortenAddress } from "@/utils/format";
import { Sidebar } from "@/components/shared";
import CryptoJS from "crypto-js";
import { ethers } from "ethers";

/**
 * 2. Main Chat Client View
 * Serves as the layout container wrapping the Sidebar and Chat Area.
 * @returns {JSX.Element}
 */
export default function ChatDashboard() {
  const navigate = useNavigate();
  const { token, logout, isAuthenticated } = useAuth();
  const { address, wallet } = useWallet();
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
  const [autoDeleteMode, setAutoDeleteMode] = useState<string>(() => {
    return localStorage.getItem("autoDeleteMode") || "never";
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
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
    const sweepOldMessages = async () => {
      if (autoDeleteMode === "never" || autoDeleteMode === "close") return;
      const now = Date.now();
      let thresholdTime = now;

      if (autoDeleteMode === "1") thresholdTime = now - 24 * 60 * 60 * 1000;
      else if (autoDeleteMode === "3")
        thresholdTime = now - 3 * 24 * 60 * 60 * 1000;
      else if (autoDeleteMode === "7")
        thresholdTime = now - 7 * 24 * 60 * 60 * 1000;
      else if (autoDeleteMode === "30")
        thresholdTime = now - 30 * 24 * 60 * 60 * 1000;

      try {
        await db.messages.where("timestamp").below(thresholdTime).delete();
      } catch (err) {
        console.error("Failed to sweep old messages", err);
      }
    };
    sweepOldMessages();
  }, [autoDeleteMode]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (autoDeleteMode === "close") {
        db.messages.clear();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [autoDeleteMode]);

  const handleModeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const mode = e.target.value;
    setAutoDeleteMode(mode);
    localStorage.setItem("autoDeleteMode", mode);
  };

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

  /**
   * 3. Handle sending text over WebRTC
   * @param {React.SyntheticEvent} e - Form event
   * @returns {Promise<void>}
   */
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

      // Guard clause for type safety
      if (!encryptedMsg) throw new Error("Encryption failed");

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

  /**
   * 4. Handle sending images over WebRTC
   * @param {ChangeEvent<HTMLInputElement>} e - File input event
   * @returns {Promise<void>}
   */
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

        // Guard clause for type safety
        if (!encryptedImage) throw new Error("Encryption failed");

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

  /**
   * 5. Export encrypted chat history
   * @returns {Promise<void>}
   */
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

  /**
   * 6. Import and decrypt chat history
   * @param {ChangeEvent<HTMLInputElement>} e - File input event
   * @returns {Promise<void>}
   */
  const handleImportChat = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let backupKey = wallet?.privateKey;
      if (!backupKey) {
        const password = prompt(
          "Enter your encryption password to decrypt backup:",
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

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const encryptedData = event.target?.result as string;
          const bytes = CryptoJS.AES.decrypt(
            encryptedData,
            backupKey as string,
          );
          const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

          if (!decryptedString)
            throw new Error("Invalid decryption key or corrupt file.");

          const parsedMessages = JSON.parse(decryptedString);

          // Hapus chat lama biar gak duplikat (opsional, tergantung logic bisnis lu)
          await db.messages.clear();

          // Masukin data yang udah di-decrypt ke IndexedDB
          await db.messages.bulkAdd(parsedMessages);

          alert("Backup successfully restored!");
          // Reload page to refresh state
          window.location.reload();
        } catch (err) {
          console.error("Import Error:", err);
          alert(
            "Failed to restore backup. Make sure you are using the correct file and identity.",
          );
        }
      };
      reader.readAsText(file);
    } catch {
      alert("Import failed. Could not authenticate identity.");
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 font-sans antialiased selection:bg-indigo-500/30">
      {/* Sidebar Injected Here */}
      <Sidebar
        myUsername={myUsername}
        address={address}
        isConnected={isConnected}
        activeRelay={activeRelay}
        defaultRelays={defaultRelays}
        changeRelay={changeRelay}
        addCustomRelay={addCustomRelay}
        activeSessions={activeSessions}
        activeChat={activeChat}
        switchChat={switchChat}
        connectedPeers={connectedPeers}
        targetUsername={targetUsername}
        setTargetUsername={setTargetUsername}
        isSearching={isSearching}
        handleConnectPeer={handleConnectPeer}
        pendingRequests={pendingRequests}
        handleAcceptRequest={handleAcceptRequest}
        handleRejectRequest={handleRejectRequest}
        autoDeleteMode={autoDeleteMode}
        handleModeChange={handleModeChange}
        handleExportChat={handleExportChat}
        handleImportChat={handleImportChat}
        logout={() => {
          logout();
          navigate("/login");
        }}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-zinc-950 relative">
        <div className="h-16 border-b border-zinc-800 flex items-center px-8 bg-zinc-950/80 backdrop-blur-md z-10 absolute top-0 w-full">
          {activeChat ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shadow-inner">
                  {activeUsername?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-100 capitalize">
                    {activeUsername}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {isWebRTCConnected ? (
                      <span className="text-[10px] text-emerald-500 font-medium">
                        Secured Tunnel Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-500 font-medium">
                        Negotiating Keys...
                      </span>
                    )}
                  </div>
                </div>
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
              <div className="w-16 h-16 mb-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
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
                Zero Data Retention Area
              </p>
              <p className="text-sm">
                Select a chat or start a new handshake to begin.
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
                    className={`max-w-[65%] px-5 py-3 shadow-sm ${msg.isMine ? "bg-indigo-600 text-zinc-50 rounded-2xl rounded-tr-sm" : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-2xl rounded-tl-sm"}`}
                  >
                    {msg.isImage ? (
                      <img
                        src={msg.text}
                        alt="p2p-attachment"
                        className="rounded-lg max-w-full h-auto mb-2 border border-white/10"
                      />
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-words">
                        {msg.text}
                      </p>
                    )}
                    <p
                      className={`text-[10px] mt-2 font-medium ${msg.isMine ? "text-indigo-200 text-right" : "text-zinc-500"}`}
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
                className="p-3.5 text-zinc-400 hover:text-indigo-400 bg-zinc-900 rounded-xl border border-zinc-800 transition-colors disabled:opacity-50"
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
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3.5 text-sm text-zinc-100 outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50 transition-all placeholder-zinc-600"
              />
              <button
                type="submit"
                disabled={!messageInput.trim() || !isWebRTCConnected}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-7 py-3.5 text-sm font-medium transition-colors disabled:opacity-50 shadow-lg shadow-indigo-500/20"
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
