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
import ms from "ms";

/**
 * Represents the possible states of the peer-to-peer connection lifecycle.
 *
 * @typedef {'idle' | 'connecting' | 'connected' | 'offline'} ConnectionState
 */
export type ConnectionState = "idle" | "connecting" | "connected" | "offline";

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
  connectionState: ConnectionState;
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
  pendingRequestsTotal: number;
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

  /**
   * Tracks the current state of the peer-to-peer connection lifecycle.
   * Drives UI gating across the ChatHeader and ChatInput components.
   */
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");

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

  /**
   * Ref that stores the handle of the active 8-second connection timeout
   * so it can be cleared when the data channel opens successfully.
   */
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Ref that stores the handle of the 10-second auto-reconnect interval
   * so it can be cleared when the state leaves 'offline'.
   */
  const reconnectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      if (autoDeleteMode === "1") thresholdTime = now - ms("1d");
      else if (autoDeleteMode === "3")
        thresholdTime = now - ms("3d");
      else if (autoDeleteMode === "7")
        thresholdTime = now - ms("7d");
      else if (autoDeleteMode === "30")
        thresholdTime = now - ms("30d");
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

  /**
   * Resets the idempotency guard whenever the active chat or initiators map changes,
   * allowing a fresh connection attempt for the newly selected peer.
   */
  useEffect(() => {
    const current = activeChat?.toLowerCase();
    if (current) {
      webrtcInitiated.current[current] = false;
    }
  }, [activeChat, initiators]);

  /**
   * Auto-Start State Machine.
   *
   * Fires whenever the active chat, secret availability, or initiator role changes.
   * If this client is the initiator and a shared secret exists but the data channel
   * is not yet open, it transitions to 'connecting', calls `initiateWebRTCConnection`,
   * and arms an 8-second timeout stored in `connectionTimeoutRef`.
   *
   * The timeout is intentionally NOT cleared in this effect's cleanup because
   * React will re-run this effect whenever `connectedPeers` updates (which
   * occurs during ICE negotiation), and an early cleanup would cancel the timer
   * before it has had a chance to fire. The timeout is exclusively cleared by
   * the Connected Transition Effect when the data channel opens.
   */
  useEffect(() => {
    const current = activeChat?.toLowerCase();

    if (!current) {
      setConnectionState("idle");
      return;
    }

    if (connectedPeers.includes(current)) {
      setConnectionState("connected");
      return;
    }

    if (
      current &&
      hasSecret(current) &&
      !connectedPeers.includes(current) &&
      initiators[current] === true
    ) {
      if (!webrtcInitiated.current[current]) {
        webrtcInitiated.current[current] = true;
        setConnectionState("connecting");

        if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);

        setTimeout(() => initiateWebRTCConnection(current), 1000);

        connectionTimeoutRef.current = setTimeout(() => {
          setConnectionState((prev) => {
            if (prev === "connecting") {
              forceDisconnectPeer(current);
              return "offline";
            }
            return prev;
          });
        }, 8000);
      }
    }
  }, [
    activeChat,
    initiateWebRTCConnection,
    hasSecret,
    connectedPeers,
    initiators,
    forceDisconnectPeer,
  ]);

  /**
   * Global timer cleanup effect.
   *
   * Runs only on component unmount and clears both the connection timeout
   * and the reconnect interval to prevent memory leaks and stale state updates
   * after the provider has been torn down.
   */
  useEffect(() => {
    return () => {
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      if (reconnectIntervalRef.current) clearInterval(reconnectIntervalRef.current);
    };
  }, []);

  /**
   * Connected Transition Effect.
   *
   * Watches `isWebRTCConnected` and immediately cancels the pending timeout
   * and transitions the state machine to 'connected' when the data channel opens.
   */
  useEffect(() => {
    if (isWebRTCConnected) {
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      if (reconnectIntervalRef.current) clearInterval(reconnectIntervalRef.current);
      setConnectionState("connected");
    }
  }, [isWebRTCConnected]);

  /**
   * Auto-Reconnect Effect.
   *
   * When the state is 'offline', sets up a 10-second polling interval that
   * silently re-initiates the WebRTC handshake in the background.
   * The interval is cleared when the state transitions away from 'offline'.
   */
  useEffect(() => {
    const current = activeChat?.toLowerCase();

    if (connectionState === "offline" && current) {
      if (reconnectIntervalRef.current) clearInterval(reconnectIntervalRef.current);

      reconnectIntervalRef.current = setInterval(() => {
        webrtcInitiated.current[current] = true;
        setConnectionState("connecting");
        initiateWebRTCConnection(current);

        if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = setTimeout(() => {
          setConnectionState((prev) => {
            if (prev === "connecting") {
              forceDisconnectPeer(current);
              return "offline";
            }
            return prev;
          });
        }, 8000);
      }, 10000);
    } else {
      if (reconnectIntervalRef.current) {
        clearInterval(reconnectIntervalRef.current);
        reconnectIntervalRef.current = null;
      }
    }

    return () => {
      if (reconnectIntervalRef.current) clearInterval(reconnectIntervalRef.current);
    };
  }, [connectionState, activeChat, initiateWebRTCConnection, forceDisconnectPeer]);

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
    connectionState,
    messages: messages || [],
    searchError,
    isPeerTyping,
    resetWallet,
    unreadCount,
    unreadTotal: Object.values(unreadCount).reduce((a, b) => a + b, 0),
    pendingRequestsTotal: pendingRequests.length,
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
