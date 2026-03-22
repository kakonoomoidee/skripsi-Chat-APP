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
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

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
    ephemeralPublicKey,
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
    ephemeralPublicKey,
    computeSecret,
    hasSecret,
    relayUrl: activeRelay,
    removeSecret,
    forceDisconnectPeer: handleForceDisconnect,
  });

  const {
    isWebRTCConnected,
    sendDataViaWebRTC,
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
    onPeerDisconnected: (peerAddress) => {
      showToast("Peer disconnected.", "error");
      removeActiveSession(peerAddress);
    },
  });

  // Sambungin Ref-nya
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
      } catch {}
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
    const checkIncomingForWalletRequests = async () => {
      if (!messages || messages.length === 0 || !activeChat) return;
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.isMine || lastMsg.id === undefined) return;
      try {
        const payload = JSON.parse(lastMsg.text);
        if (payload.type === "WALLET_REQUEST") {
          const myMetaMask = localStorage.getItem("linked_metamask");
          if (myMetaMask) {
            const responsePayload = JSON.stringify({
              type: "WALLET_RESPONSE",
              address: myMetaMask,
            });
            const encryptedPayload = encrypt(activeChat, responsePayload);
            if (encryptedPayload && lastMsg.id) {
              sendDataViaWebRTC(activeChat, encryptedPayload);
              await db.messages.delete(lastMsg.id);
            }
          }
        } else if (payload.type === "WALLET_RESPONSE" && lastMsg.id) {
          setPeerWalletAddress(payload.address);
          await db.messages.delete(lastMsg.id);
        } else if (payload.type === "TX_SUCCESS" && lastMsg.id) {
          await db.messages.update(lastMsg.id, {
            text: encryptLocalDB(
              `[RECEIVED] Transfer Verified!\nTx Hash: ${payload.hash}`,
            ),
          });
        }
      } catch {}
    };
    checkIncomingForWalletRequests();
  }, [
    messages,
    activeChat,
    encrypt,
    sendDataViaWebRTC,
    setPeerWalletAddress,
    encryptLocalDB,
  ]);

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

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined)
    throw new Error("useChatContext must be used within a ChatProvider");
  return context;
};
