import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  ReactNode,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/utils/db";
import { useAuth } from "@/hooks/auth/useAuth";
import { useWallet } from "@/hooks/security/useWallet";
import { useCrypto } from "@/hooks/security/useCrypto";
import { useSocket } from "@/hooks/network/useSocket";
import { useChatLogic } from "@/hooks/chat/useChatLogic";
import { useRelay } from "@/hooks/network/useRelay";
import { useWebRTC } from "@/hooks/network/useWebRTC";
import { useUIStore, useSessionStore, useWalletStore } from "@/store";
import { useDuplicateTab } from "@/hooks/ui/useDuplicateTab";
import { useCallActions } from "@/hooks/chat/useCallActions";
import { useMessageSender } from "@/hooks/chat/useMessageSender";
import { DuplicateTabWarning } from "@/components/chat/index";

export interface ChatContextValue {
  isAuthenticated: boolean;
  logout: () => void;
  address: string | null;
  myUsername: string;
  activeRelay: string;
  defaultRelays: string[];
  changeRelay: (url: string) => void;
  addCustomRelay: (url: string) => Promise<void>;
  isConnected: boolean;
  targetUsername: string;
  setTargetUsername: (val: string) => void;
  activeChat: string | null;
  activeUsername: string;
  pendingRequests: any[];
  activeSessions: any[];
  switchChat: (session: any) => void;
  closeChat: () => void;
  isSearching: boolean;
  handleConnectPeer: () => void;
  handleAcceptRequest: (req: any) => void;
  handleRejectRequest: (addr: string) => void;
  connectedPeers: string[];
  isWebRTCConnected: boolean;
  messages: any[];
  handleSendMessage: (e: React.SyntheticEvent) => Promise<void>;
  handleSendImage: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleSendAudio: (audioBlob: Blob) => Promise<void>;
  handleSendDocument: (fileName: string, base64: string) => Promise<void>;
  handleSendCameraPhoto: (base64: string) => Promise<void>;
  resetWallet: () => void;
  requestPeerWallet: () => void;
  handleSendCrypto: (amount: string) => Promise<void>;
  searchError: string;
  isPeerTyping: boolean;
  handleTyping: () => void;
  isIncomingCall: boolean;
  isInCall: boolean;
  isMuted: boolean;
  initiateCall: () => void;
  acceptCall: () => void;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  unreadCount: Record<string, number>;
  unreadTotal: number;
  sendMarkAsRead: (peerAddress: string) => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

/**
 * Provides global chat context including state management for messaging, WebRTC connections,
 * cryptography, and crypto wallet transactions within the P2P application.
 *
 * @param {Object} props - Component properties.
 * @param {ReactNode} props.children - Child components that require access to the chat context.
 * @returns {React.JSX.Element} The populated Context Provider.
 */
export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const { token, logout, isAuthenticated } = useAuth();
  const { address, resetWallet } = useWallet();
  const { activeRelay, changeRelay, defaultRelays, addCustomRelay } =
    useRelay();
  const { socket, isConnected, isSessionRevoked } = useSocket(
    token,
    activeRelay,
  );

  const {
    generateHandshakeKeys,
    computeSecret,
    encrypt,
    decrypt,
    encryptLocalDB,
    decryptLocalDB,
    hasSecret,
    removeSecret,
  } = useCrypto();

  const { showToast, setIsMobileSidebarOpen } = useUIStore();
  const { autoDeleteMode } = useSessionStore();
  const { setPeerWalletAddress } = useWalletStore();

  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const isDuplicateTab = useDuplicateTab();

  const forceDisconnectPeerRef = useRef<((addr: string) => void) | null>(null);
  const handleForceDisconnect = useCallback((addr: string) => {
    if (forceDisconnectPeerRef.current) forceDisconnectPeerRef.current(addr);
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "auth_token") window.location.reload();
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const {
    targetUsername,
    setTargetUsername,
    activeChat,
    activeUsername,
    myUsername,
    pendingRequests,
    activeSessions,
    switchChat,
    closeChat,
    isSearching,
    initiators,
    handleConnectPeer,
    handleAcceptRequest,
    handleRejectRequest,
    searchError,
    isPeerTyping,
    setIsPeerTyping,
    removeActiveSession,
  } = useChatLogic({
    address,
    socket,
    generateHandshakeKeys,
    computeSecret,
    hasSecret,
    relayUrl: activeRelay,
    removeSecret,
    forceDisconnectPeer: handleForceDisconnect,
    showToast,
  });

  const {
    isWebRTCConnected,
    sendDataViaWebRTC,
    sendMarkAsRead,
    initiateWebRTCConnection,
    connectedPeers,
    startVoiceCall,
    stopVoiceCall,
    toggleMicMute,
    forceDisconnectPeer,
  } = useWebRTC({
    socket,
    myAddress: address,
    activeChat,
    decrypt,
    encryptLocalDB,
    encrypt,
    generateHandshakeKeys,
    computeSecret,
    hasSecret,
    setIsPeerTyping,
    onCallOffer: () => setIsIncomingCall(true),
    onCallAccepted: () => {
      setIsInCall(true);
      showToast("Call connected!", "success");
    },
    onCallRejected: () => showToast("Call declined by peer.", "error"),
    onCallEnded: () => {
      setIsInCall(false);
      setIsIncomingCall(false);
      setIsMuted(false);
      showToast("Call ended.", "error");
    },
    onPeerDisconnected: (peerAddress: string) => {
      showToast("Peer disconnected.", "error");
      removeActiveSession(peerAddress);
    },
  });

  useEffect(() => {
    forceDisconnectPeerRef.current = forceDisconnectPeer;
  }, [forceDisconnectPeer]);

  const callActions = useCallActions({
    activeChat,
    isWebRTCConnected,
    encrypt,
    sendDataViaWebRTC,
    startVoiceCall,
    stopVoiceCall,
    toggleMicMute,
    setIsIncomingCall,
    setIsInCall,
    setIsMuted,
    showToast,
  });

  const messageSender = useMessageSender({
    address,
    activeChat,
    isWebRTCConnected,
    hasSecret,
    encrypt,
    encryptLocalDB,
    decryptLocalDB,
    sendDataViaWebRTC,
    showToast,
    peerWalletAddress: useWalletStore.getState().peerWalletAddress,
  });

  const webrtcInitiated = useRef<{ [addr: string]: boolean }>({});

  const rawMessages = useLiveQuery(
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

  const messages = React.useMemo(() => {
    if (!rawMessages) return [];
    return rawMessages.map((msg) => ({
      ...msg,
      text: decryptLocalDB(msg.text),
    }));
  }, [rawMessages, decryptLocalDB]);

  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  const globalUnreadMessages = useLiveQuery(
    () => {
      if (!address) return [];
      return db.messages
        .filter(
          (msg) =>
            msg.ownerAddress === address.toLowerCase() &&
            !msg.isMine &&
            msg.status !== "read"
        )
        .toArray();
    },
    [address],
    []
  );

  const unreadCount = React.useMemo(() => {
    const counts: Record<string, number> = {};
    if (globalUnreadMessages) {
      globalUnreadMessages.forEach((msg) => {
        counts[msg.chatId] = (counts[msg.chatId] || 0) + 1;
      });
    }
    return counts;
  }, [globalUnreadMessages]);

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
      } catch (error) {}
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

  useEffect(() => {
    if (!activeChat || !isWebRTCConnected) return;

    if (unreadCount[activeChat] && unreadCount[activeChat] > 0) {
      sendMarkAsRead(activeChat);
      db.messages
        .filter(
          (msg) =>
            msg.ownerAddress === address?.toLowerCase() &&
            msg.chatId === activeChat.toLowerCase() &&
            !msg.isMine &&
            msg.status !== "read"
        )
        .modify({ status: "read" });
    }
  }, [activeChat, isWebRTCConnected, sendMarkAsRead, unreadCount, address]);

  useEffect(() => {
    const current = activeChat?.toLowerCase();
    if (current) {
      webrtcInitiated.current[current] = false;
    }
  }, [activeChat, initiators]);

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

  useEffect(() => {
    const handleProtocolMessages = async () => {
      if (!messages || messages.length === 0) return;

      const latestMessage = messages[messages.length - 1];
      if (!latestMessage || !latestMessage.text) return;

      const { peerWalletAddress, setPeerWalletAddress } =
        useWalletStore.getState();

      try {
        const parsedData = JSON.parse(latestMessage.text);

        if (parsedData.type === "WALLET_RESPONSE" && parsedData.address) {
          if (peerWalletAddress !== parsedData.address) {
            setPeerWalletAddress(parsedData.address);
          }
          if (latestMessage.id) {
            await db.messages.delete(latestMessage.id);
          }
        }

        if (parsedData.type === "WALLET_REQUEST") {
          const txAddress =
            localStorage.getItem("internal_tx_wallet") ||
            localStorage.getItem("linked_metamask") ||
            address;

          if (txAddress && activeChat) {
            const responsePayload = JSON.stringify({
              type: "WALLET_RESPONSE",
              address: txAddress,
            });

            const encryptedResponse = encrypt(activeChat, responsePayload);
            if (encryptedResponse) {
              sendDataViaWebRTC(activeChat, encryptedResponse);
            }
          }
          if (latestMessage.id) {
            await db.messages.delete(latestMessage.id);
          }
        }
      } catch (error) {
        return;
      }
    };

    handleProtocolMessages();
  }, [messages, activeChat, address, sendDataViaWebRTC]);

  const handleSwitchChatWrapped = (session: any): void => {
    switchChat(session);
    setPeerWalletAddress(null);
    setIsMobileSidebarOpen(false);
  };

  const handleAcceptRequestWrapped = (req: any): void => {
    handleAcceptRequest(req);
    setIsMobileSidebarOpen(false);
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
    switchChat: handleSwitchChatWrapped,
    closeChat,
    isSearching,
    handleConnectPeer,
    handleAcceptRequest: handleAcceptRequestWrapped,
    handleRejectRequest,
    connectedPeers,
    isWebRTCConnected,
    messages: messages || [],
    searchError,
    isPeerTyping,
    resetWallet,
    unreadCount,
    unreadTotal: Object.values(unreadCount).reduce((a, b) => a + b, 0),
    sendMarkAsRead,
    ...messageSender,
    ...callActions,
    isIncomingCall,
    isInCall,
    isMuted,
  };

  if (isDuplicateTab) {
    return <DuplicateTabWarning />;
  }

  if (isSessionRevoked) {
    return (
      <DuplicateTabWarning
        title="Session Revoked"
        message="Your account was accessed from another device. To prevent split-brain routing in the P2P network, this session has been terminated."
      />
    );
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

/**
 * Custom hook to securely access the Chat Context payload.
 *
 * @returns {ChatContextValue} The initialized chat context variables and methods.
 * @throws {Error} Throws if utilized outside of the ChatProvider hierarchy.
 */
export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined)
    throw new Error("useChatContext must be used within a ChatProvider");
  return context;
};
