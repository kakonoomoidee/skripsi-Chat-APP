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
 * @typedef {'idle' | 'connecting' | 'connected' | 'offline'} ConnectionState
 */
export type ConnectionState = "idle" | "connecting" | "connected" | "offline";

/**
 * Shape of the value exposed by {@link ChatContext}.
 */
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
  connectionStates: Record<string, ConnectionState>;
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
  acceptContact: (peerAddress: string) => Promise<void>;
  blockContact: (peerAddress: string) => Promise<void>;
  archiveContact: (peerAddress: string) => Promise<void>;
  unarchiveContact: (peerAddress: string) => Promise<void>;
  forceDisconnectPeer: (peerAddress: string) => void;
  activeAreaView: "chat" | "settings";
  setActiveAreaView: (view: "chat" | "settings") => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

/**
 * Provides global chat context including state management for messaging, WebRTC
 * connections, cryptography, and crypto wallet transactions within the P2P application.
 * @param {Object}    props          - Component properties.
 * @param {ReactNode} props.children - Child components requiring access to the chat context.
 * @returns {React.JSX.Element} The populated Context Provider.
 */
export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const { token, logout, isAuthenticated } = useAuth();
  const { address, resetWallet } = useWallet();
  const { activeRelay, changeRelay, defaultRelays, addCustomRelay } = useRelay();
  const { socket, isConnected, isSessionRevoked } = useSocket(token, activeRelay);

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
  const [activeAreaView, setActiveAreaView] = useState<"chat" | "settings">("chat");
  const [connectionStates, setConnectionStates] = useState<Record<string, ConnectionState>>({});

  const isDuplicateTab = useDuplicateTab();

  const forceDisconnectPeerRef = useRef<((addr: string) => void) | null>(null);
  const initiateWebRTCConnectionRef = useRef<((addr: string) => Promise<void>) | null>(null);
  const initiateHandshakeRef = useRef<((addr: string) => void) | null>(null);
  const activeChatRef = useRef<string | null>(null);

  const webrtcInitiated = useRef<{ [addr: string]: boolean }>({});
  const connectedPeersRef = useRef<string[]>([]);
  const avatarSyncedPeers = useRef<{ [addr: string]: boolean }>({});
  const pingTimeoutRef = useRef<{ [addr: string]: any }>({});
  const reconnectIntervalRef = useRef<{ [addr: string]: any }>({});

  /**
   * Tracks peers for whom a pong was received but the ECDH handshake has not
   * yet completed. When onHandshakeComplete fires for one of these addresses,
   * initiateWebRTCConnection is called immediately.
   */
  const pendingWebRTCAfterHandshake = useRef<Set<string>>(new Set());

  /**
   * Stable forwarder that delegates to forceDisconnectPeer via a ref so that
   * useChatLogic can call it without capturing a stale closure.
   *
   * @param {string} addr - Lowercase peer wallet address to disconnect.
   * @returns {void}
   */
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
    initiateHandshake,
    searchError,
    isPeerTyping,
    setIsPeerTyping,
    acceptContact,
    blockContact,
    archiveContact,
    unarchiveContact,
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
    onHandshakeComplete: (peerAddress: string) => {
      const addr = peerAddress.toLowerCase();
      if (pendingWebRTCAfterHandshake.current.has(addr)) {
        pendingWebRTCAfterHandshake.current.delete(addr);
        initiateWebRTCConnectionRef.current?.(addr);
      }
    },
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
    checkPeerStatus,
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
      const addr = peerAddress.toLowerCase();
      webrtcInitiated.current[addr] = false;
      showToast("Peer disconnected.", "error");
      setConnectionStates((prev) => ({ ...prev, [addr]: "offline" }));
    },
    onPongReceived: (peerAddress: string) => {
      const addr = peerAddress.toLowerCase();
      if (pingTimeoutRef.current[addr]) {
        clearTimeout(pingTimeoutRef.current[addr]);
        delete pingTimeoutRef.current[addr];
      }

      setConnectionStates((prev) => ({ ...prev, [addr]: "connecting" }));

      if (hasSecret(addr)) {
        initiateWebRTCConnectionRef.current?.(addr);
      } else {
        pendingWebRTCAfterHandshake.current.add(addr);
        initiateHandshakeRef.current?.(addr);
      }
    },
  });

  useEffect(() => {
    forceDisconnectPeerRef.current = forceDisconnectPeer;
  }, [forceDisconnectPeer]);

  useEffect(() => {
    initiateWebRTCConnectionRef.current = initiateWebRTCConnection;
  }, [initiateWebRTCConnection]);

  useEffect(() => {
    initiateHandshakeRef.current = initiateHandshake;
  }, [initiateHandshake]);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    connectedPeersRef.current = connectedPeers;
  }, [connectedPeers]);

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
            msg.status !== "read",
        )
        .toArray();
    },
    [address],
    [],
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
      if (autoDeleteMode === "1")       thresholdTime = now - ms("1d");
      else if (autoDeleteMode === "3")  thresholdTime = now - ms("3d");
      else if (autoDeleteMode === "7")  thresholdTime = now - ms("7d");
      else if (autoDeleteMode === "30") thresholdTime = now - ms("30d");
      try {
        await db.messages.where("timestamp").below(thresholdTime).delete();
      } catch (_) {}
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
    if (!unreadCount[activeChat] || unreadCount[activeChat] === 0) return;
    sendMarkAsRead(activeChat);
    db.messages
      .filter(
        (msg) =>
          msg.ownerAddress === address?.toLowerCase() &&
          msg.chatId === activeChat.toLowerCase() &&
          !msg.isMine &&
          msg.status !== "read",
      )
      .modify({ status: "read" });
  }, [activeChat, isWebRTCConnected, sendMarkAsRead, unreadCount, address]);



  /**
   * Auto-Start Effect.
   *
   * Fires when activeChat or the initiators map changes. If this client is the
   * designated initiator for the current peer, a ping is sent to verify the
   * peer is online before any key material is exchanged or any WebRTC offer
   * is emitted.
   *
   * The webrtcInitiated ref prevents duplicate pings when initiators updates
   * multiple times in quick succession (e.g. during socket reconnection).
   *
   * If the peer is already in connectedPeers (e.g. switching back to an open
   * chat) the state transitions directly to 'connected' without a redundant ping.
   *
   * Ping timeout behaviour:
   * - On pong received within 5 s → onPongReceived handles ECDH + WebRTC.
   * - On timeout → guard reset, state back to 'idle', error toast shown.
   */
  useEffect(() => {
    const current = activeChat?.toLowerCase();

    if (!current) {
      return;
    }

    if (connectedPeersRef.current.includes(current)) {
      setConnectionStates((prev) => ({ ...prev, [current]: "connected" }));
      return;
    }

    if (initiators[current] !== true) return;

    if (webrtcInitiated.current[current]) return;

    webrtcInitiated.current[current] = true;
    setConnectionStates((prev) => ({ ...prev, [current]: "connecting" }));

    checkPeerStatus(current);

    pingTimeoutRef.current[current] = setTimeout(() => {
      delete pingTimeoutRef.current[current];
      pendingWebRTCAfterHandshake.current.delete(current);
      setConnectionStates((prev) => ({ ...prev, [current]: "idle" }));
      showToast("Peer is offline or unreachable.", "error");
      removeActiveSession(current);
    }, ms("5s"));
  }, [activeChat, checkPeerStatus, initiators, showToast, removeActiveSession]);

  /**
   * Global Timer Cleanup Effect.
   *
   * Runs only on component unmount. Clears the ping timeout and reconnect
   * interval to prevent memory leaks and stale callbacks after the provider
   * is torn down.
   */
  useEffect(() => {
    return () => {
      Object.values(pingTimeoutRef.current).forEach((t) => clearTimeout(t as any));
      Object.values(reconnectIntervalRef.current).forEach((t) => clearInterval(t as any));
    };
  }, []);

  /**
   * Connected Transition Effect.
   *
   * Cancels all pending timers and transitions to 'connected' the moment the
   * WebRTC data channel opens successfully.
   */
  useEffect(() => {
    if (!isWebRTCConnected || !activeChat) return;
    const current = activeChat.toLowerCase();

    if (pingTimeoutRef.current[current]) {
      clearTimeout(pingTimeoutRef.current[current]);
      delete pingTimeoutRef.current[current];
    }
    if (reconnectIntervalRef.current[current]) {
      clearInterval(reconnectIntervalRef.current[current]);
      delete reconnectIntervalRef.current[current];
    }
    
    webrtcInitiated.current[current] = false;
    setConnectionStates((prev) => ({ ...prev, [current]: "connected" }));
  }, [isWebRTCConnected, activeChat]);

  /**
   * Avatar Auto-Sync Effect.
   *
   * Transmits a PROFILE_SYNC message the moment the data channel opens. An
   * idempotency guard ensures the sync happens exactly once per peer per session.
   */
  useEffect(() => {
    if (!isWebRTCConnected || !activeChat) return;
    const peer = activeChat.toLowerCase();
    if (avatarSyncedPeers.current[peer]) return;
    const myAvatar = localStorage.getItem("my_avatar");
    if (!myAvatar) return;
    avatarSyncedPeers.current[peer] = true;
    const payload = JSON.stringify({ type: "PROFILE_SYNC", avatar: myAvatar });
    const encrypted = encrypt(peer, payload);
    if (encrypted) sendDataViaWebRTC(peer, encrypted);
  }, [isWebRTCConnected, activeChat, encrypt, sendDataViaWebRTC]);

  /**
   * Avatar Guard Reset Effect.
   *
   * Clears the idempotency flag for the previously active peer whenever
   * activeChat changes so the next connection delivers a fresh avatar sync.
   */
  useEffect(() => {
    if (!activeChat) return;
    const peer = activeChat.toLowerCase();
    return () => {
      delete avatarSyncedPeers.current[peer];
    };
  }, [activeChat]);

  /**
   * Auto-Reconnect Effect.
   *
   * When the state is 'offline', pings the peer every 10 seconds. If a pong
   * is received, onPongReceived handles the transition back to 'connecting'
   * and re-initiates the WebRTC handshake. The interval stops automatically
   * when the state leaves 'offline'.
   */
  useEffect(() => {
    const current = activeChat?.toLowerCase();

    if (current && connectionStates[current] === "offline") {
      if (reconnectIntervalRef.current[current]) {
        clearInterval(reconnectIntervalRef.current[current]);
      }

      reconnectIntervalRef.current[current] = setInterval(() => {
        if (connectedPeersRef.current.includes(current)) {
          if (reconnectIntervalRef.current[current]) {
            clearInterval(reconnectIntervalRef.current[current]);
            delete reconnectIntervalRef.current[current];
          }
          setConnectionStates((prev) => ({ ...prev, [current]: "connected" }));
          return;
        }
        webrtcInitiated.current[current] = false;
        checkPeerStatus(current);
      }, ms("10s"));
    } else if (current) {
      if (reconnectIntervalRef.current[current]) {
        clearInterval(reconnectIntervalRef.current[current]);
        delete reconnectIntervalRef.current[current];
      }
    }
  }, [connectionStates, activeChat, checkPeerStatus]);

  /**
   * Protocol Message Handler Effect.
   *
   * Intercepts the latest message on every render and handles system-level
   * protocol payloads that should not appear in the chat UI:
   *
   * - WALLET_RESPONSE — Stores the peer's wallet address in global state and
   *   deletes the sentinel message from IndexedDB.
   * - WALLET_REQUEST  — Responds with the local user's wallet address and
   *   deletes the sentinel message from IndexedDB.
   * - PROFILE_SYNC    — Persists the peer's avatar to the contacts table and
   *   deletes the sentinel message from IndexedDB.
   */
  useEffect(() => {
    const handleProtocolMessages = async () => {
      if (!messages || messages.length === 0) return;
      const latestMessage = messages[messages.length - 1];
      if (!latestMessage?.text) return;
      const { peerWalletAddress, setPeerWalletAddress } = useWalletStore.getState();
      try {
        const parsedData = JSON.parse(latestMessage.text);

        if (parsedData.type === "WALLET_RESPONSE" && parsedData.address) {
          if (peerWalletAddress !== parsedData.address) {
            setPeerWalletAddress(parsedData.address);
          }
          if (latestMessage.id) await db.messages.delete(latestMessage.id);
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
            if (encryptedResponse) sendDataViaWebRTC(activeChat, encryptedResponse);
          }
          if (latestMessage.id) await db.messages.delete(latestMessage.id);
        }

        if (parsedData.type === "PROFILE_SYNC" && parsedData.avatar && activeChat) {
          const existing = await db.contacts.get(activeChat.toLowerCase());
          if (existing) {
            await db.contacts.put({ ...existing, avatar: parsedData.avatar });
          }
          if (latestMessage.id) await db.messages.delete(latestMessage.id);
        }
      } catch (_) {}
    };
    handleProtocolMessages();
  }, [messages, activeChat, address, sendDataViaWebRTC]);

  /**
   * Wraps switchChat with sidebar and area-view side effects.
   *
   * @param {any} session - The session object to switch to.
   * @returns {void}
   */
  const handleSwitchChatWrapped = (session: any): void => {
    switchChat(session);
    setPeerWalletAddress(null);
    setIsMobileSidebarOpen(false);
    setActiveAreaView("chat");
  };

  /**
   * Wraps handleAcceptRequest with a mobile sidebar close.
   *
   * @param {any} req - The pending connection request to accept.
   * @returns {void}
   */
  const handleAcceptRequestWrapped = (req: any): void => {
    handleAcceptRequest(req);
    setIsMobileSidebarOpen(false);
  };

  const value: ChatContextValue = {
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
    connectionStates,
    messages: messages || [],
    searchError,
    isPeerTyping,
    resetWallet,
    unreadCount,
    unreadTotal: Object.values(unreadCount).reduce((a, b) => a + b, 0),
    pendingRequestsTotal: pendingRequests.length,
    sendMarkAsRead,
    acceptContact,
    blockContact,
    archiveContact,
    unarchiveContact,
    forceDisconnectPeer,
    activeAreaView,
    setActiveAreaView,
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
 * @throws {Error} Throws if utilized outside of the {@link ChatProvider} hierarchy.
 */
export const useChatContext = (): ChatContextValue => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
};