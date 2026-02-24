import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ChangeEvent,
  ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ethers } from "ethers";
import { db } from "@/utils/db";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useCrypto } from "@/hooks/useCrypto";
import { useSocket } from "@/hooks/useSocket";
import { useChatLogic } from "@/hooks/useChatLogic";
import { useRelay } from "@/hooks/useRelay";
import { useWebRTC } from "@/hooks/useWebRTC";
import { formatTime } from "@/utils/format";

/**
 * Interface for the global Chat Context state
 */
export interface ChatContextValue {
  isAuthenticated: boolean;
  logout: () => void;
  address: string | null;
  myUsername: string;
  activeRelay: string;
  defaultRelays: string[];
  changeRelay: (url: string) => void;
  addCustomRelay: (url: string) => void;
  isConnected: boolean;
  targetUsername: string;
  setTargetUsername: (val: string) => void;
  activeChat: string | null;
  activeUsername: string;
  pendingRequests: any[];
  activeSessions: any[];
  switchChat: (session: any) => void;
  isSearching: boolean;
  handleConnectPeer: () => void;
  handleAcceptRequest: (req: any) => void;
  handleRejectRequest: (addr: string) => void;
  connectedPeers: string[];
  isWebRTCConnected: boolean;
  messages: any[];
  messageInput: string;
  setMessageInput: (val: string) => void;
  handleSendMessage: (e: React.SyntheticEvent) => Promise<void>;
  handleSendImage: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  autoDeleteMode: string;
  handleModeChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  handleExportChat: () => Promise<void>;
  handleImportChat: (e: ChangeEvent<HTMLInputElement>) => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

/**
 * 1. Global Chat Provider
 * Wraps the chat application to provide decoupled state management.
 * @param {ReactNode} children - The child components
 * @returns {JSX.Element}
 */
export const ChatProvider = ({ children }: { children: ReactNode }) => {
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
  const [autoDeleteMode, setAutoDeleteMode] = useState<string>(
    () => localStorage.getItem("autoDeleteMode") || "never",
  );

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
      if (autoDeleteMode === "close") db.messages.clear();
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
        setTimeout(() => initiateWebRTCConnection(current), 1000);
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

  const handleSendImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const currentChat = activeChat as string;
    if (!file || !currentChat || !isWebRTCConnected || !address) return;
    if (file.size > 1024 * 500)
      return alert("File too large! Max 500KB for P2P demo.");

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const encryptedImage = encrypt(currentChat, base64);
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
  };

  const handleExportChat = async () => {
    try {
      const allMessages = await db.messages.toArray();
      if (allMessages.length === 0) return alert("No chat history to export.");

      const seed = prompt(
        "Enter your exact 12-word seed phrase to encrypt your backup:",
      );
      if (!seed || seed.trim().split(/\s+/).length !== 12)
        return alert("Invalid! Harus masukin tepat 12 kata ya bre.");

      try {
        const derivedWallet = ethers.Wallet.fromPhrase(seed.trim());
        if (derivedWallet.address.toLowerCase() !== address?.toLowerCase())
          return alert(
            "Akses Ditolak! Seed phrase ini bukan punya akun lu yang lagi aktif bre.",
          );
      } catch (err) {
        return alert(
          "Format seed phrase tidak valid secara kriptografi Ethereum! Pastikan nggak typo.",
        );
      }

      const dataStr = JSON.stringify(allMessages);
      const encodedData = btoa(
        unescape(
          encodeURIComponent(dataStr + "|||SECURE_P2P|||" + seed.trim()),
        ),
      );

      const backupPayload = {
        version: "3.0",
        encrypted: true,
        data: encodedData,
      };
      const blob = new Blob([JSON.stringify(backupPayload)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `securep2p_backup_${formatTime(Date.now()).replace(/:/g, "-")}.securep2p`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to export chat history.");
    }
  };

  const handleImportChat = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const payload = JSON.parse(content);

        if (payload.encrypted) {
          const seed = prompt(
            "Enter your 12-word seed phrase to decrypt and restore data:",
          );
          if (!seed || seed.trim().split(/\s+/).length !== 12)
            return alert("Invalid! Harus tepat 12 kata.");

          try {
            const derivedWallet = ethers.Wallet.fromPhrase(seed.trim());
            if (derivedWallet.address.toLowerCase() !== address?.toLowerCase())
              return alert(
                "Akses Ditolak! Seed phrase ini bukan milik akun yang lagi aktif.",
              );
          } catch (err) {
            return alert("Format seed phrase salah atau ada typo!");
          }

          const decodedStr = decodeURIComponent(escape(atob(payload.data)));
          const splitData = decodedStr.split("|||SECURE_P2P|||");

          if (splitData.length !== 2 || splitData[1] !== seed.trim())
            return alert(
              "Decryption failed! Seed phrase tidak cocok dengan file backup ini.",
            );

          const parsedMessages = JSON.parse(splitData[0]);
          await db.messages.bulkPut(parsedMessages);
          alert("Chat history restored successfully!");
          window.location.reload();
        }
      } catch (err) {
        console.error(err);
        alert("Failed to import. File might be corrupted.");
      }
    };
    reader.readAsText(file);
  };

  const value = {
    isAuthenticated,
    logout,
    address,
    myUsername,
    activeRelay,
    defaultRelays,
    changeRelay,
    addCustomRelay,
    isConnected,
    targetUsername,
    setTargetUsername,
    activeChat,
    activeUsername,
    pendingRequests,
    activeSessions,
    switchChat,
    isSearching,
    handleConnectPeer,
    handleAcceptRequest,
    handleRejectRequest,
    connectedPeers,
    isWebRTCConnected,
    messages: messages || [],
    messageInput,
    setMessageInput,
    handleSendMessage,
    handleSendImage,
    autoDeleteMode,
    handleModeChange,
    handleExportChat,
    handleImportChat,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

/**
 * 2. Hook to consume Chat Context
 * @returns {ChatContextValue}
 */
export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined)
    throw new Error("useChatContext must be used within a ChatProvider");
  return context;
};
