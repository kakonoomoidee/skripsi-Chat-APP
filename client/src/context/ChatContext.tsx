import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
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
import { useChatStore, ConnectionState } from "@/store/useChatStore";
import { useMessageData } from "@/hooks/chat/useMessageData";
import {
  CHAT_PROTOCOL_TYPES,
  type ChatProtocolPayload,
} from "@/utils/chat/chatProtocol";
import { getStoredWalletAddresses } from "@/services/walletBalanceService";
import { db } from "@/utils/storage/db";

export type { ConnectionState };
import { useConnectionManager } from "@/hooks/chat/useConnectionManager";
import { useProtocolHandler } from "@/hooks/chat/useProtocolHandler";
import { AUTH_TOKEN_STORAGE_KEY } from "@/utils/storage/session";

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
  removeActiveSession: (addr: string) => void;
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
  entryPointId: number | null;
  scrollSettledRef: React.RefObject<boolean>;
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
  const { token, logout: authLogout, isAuthenticated } = useAuth();
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
  const {
    setPeerWalletAddress,
    peerWalletAddress,
    setPendingPeerWalletRequestAddress,
  } = useWalletStore();

  const chatStore = useChatStore();

  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const isDuplicateTab = useDuplicateTab();

  const forceDisconnectPeerRef = useRef<((addr: string) => void) | null>(null);
  const connectionManagerRefs = useRef<any>({});

  const handleForceDisconnect = useCallback((addr: string) => {
    if (forceDisconnectPeerRef.current) forceDisconnectPeerRef.current(addr);
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === AUTH_TOKEN_STORAGE_KEY) window.location.reload();
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const {
    targetUsername,
    setTargetUsername,
    myUsername,
    switchChat,
    closeChat,
    handleConnectPeer,
    handleAcceptRequest,
    handleRejectRequest,
    initiateHandshake,
    removeActiveSession,
    acceptContact,
    blockContact,
    archiveContact,
    unarchiveContact,
  } = useChatLogic({
    address,
    socket,
    generateHandshakeKeys,
    computeSecret,
    hasSecret,
    relayUrl: activeRelay,
    removeSecret,
    forceDisconnectPeer: handleForceDisconnect,
    onHandshakeComplete: (addr: string) =>
      connectionManagerRefs.current.handleHandshakeComplete?.(addr),
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
    activeChat: chatStore.activeChat,
    decrypt,
    encryptLocalDB,
    encrypt,
    generateHandshakeKeys,
    computeSecret,
    hasSecret,
    setIsPeerTyping: chatStore.setIsPeerTyping,
    onProtocolMessage: handleProtocolMessage,
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
    onPeerDisconnected: (addr: string) =>
      connectionManagerRefs.current.handlePeerDisconnected?.(addr),
    onPongReceived: (addr: string) =>
      connectionManagerRefs.current.handlePongReceived?.(addr),
  });

  /**
   * Handles incoming WebRTC protocol payloads without persisting them to chat history.
   *
   * @param {string} peerAddress - The peer address that sent the payload.
   * @param {ChatProtocolPayload} payload - The parsed protocol payload.
   * @returns {Promise<void>}
   */
  async function handleProtocolMessage(
    peerAddress: string,
    payload: ChatProtocolPayload,
  ): Promise<void> {
    if (payload.type === CHAT_PROTOCOL_TYPES.walletResponse) {
      if (peerWalletAddress !== payload.address) {
        setPeerWalletAddress(payload.address);
      }
      setPendingPeerWalletRequestAddress(null);
      return;
    }

    if (payload.type === CHAT_PROTOCOL_TYPES.walletRequest) {
      const { internalAddress, externalAddress } = getStoredWalletAddresses();
      const txAddress = internalAddress || externalAddress;

      if (!txAddress) {
        return;
      }

      const responsePayload = JSON.stringify({
        type: CHAT_PROTOCOL_TYPES.walletResponse,
        address: txAddress,
      });
      const encryptedResponse = encrypt(peerAddress, responsePayload);

      if (encryptedResponse) {
        sendDataViaWebRTC(peerAddress, encryptedResponse);
      }

      return;
    }

    if (
      payload.type === CHAT_PROTOCOL_TYPES.profileSync &&
      chatStore.activeChat
    ) {
      const existing = await db.contacts.get(
        chatStore.activeChat.toLowerCase(),
      );
      if (existing) {
        await db.contacts.put({
          ...existing,
          avatar: payload.avatar,
        });
      }
    }
  }

  useEffect(() => {
    forceDisconnectPeerRef.current = forceDisconnectPeer;
  }, [forceDisconnectPeer]);

  const connectionManager = useConnectionManager({
    checkPeerStatus,
    showToast,
    removeActiveSession,
    isWebRTCConnected,
    encrypt,
    sendDataViaWebRTC,
    connectedPeers,
    hasSecret,
    initiateWebRTCConnection,
    initiateHandshake,
  });

  useEffect(() => {
    connectionManagerRefs.current = connectionManager;
  }, [connectionManager]);

  const { messages, protocolMessages, entryPointId, unreadCount, unreadTotal } =
    useMessageData({
      address,
      activeChat: chatStore.activeChat,
      decryptLocalDB,
      autoDeleteMode,
    });

  const scrollSettledRef = useRef<boolean>(true);

  useProtocolHandler({
    messages: protocolMessages,
    address,
    encrypt,
    sendDataViaWebRTC,
  });

  const callActions = useCallActions({
    activeChat: chatStore.activeChat,
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
    activeChat: chatStore.activeChat,
    isWebRTCConnected,
    hasSecret,
    encrypt,
    encryptLocalDB,
    decryptLocalDB,
    sendDataViaWebRTC,
    showToast,
    peerWalletAddress,
  });

  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  const handleSwitchChatWrapped = (session: any): void => {
    switchChat(session);
    setPeerWalletAddress(null);
    setIsMobileSidebarOpen(false);
    chatStore.setActiveAreaView("chat");
  };

  const handleAcceptRequestWrapped = (req: any): void => {
    handleAcceptRequest(req);
    setIsMobileSidebarOpen(false);
  };

  /**
   * Terminates all active peer resources, resets chat session state, and then
   * completes authentication logout and navigation to the login route.
   *
   * @returns {void}
   */
  const logout = useCallback((): void => {
    const managerRefs = connectionManagerRefs.current ?? {};
    const peerConnectionsRef = managerRefs.peerConnections;
    const peerConnectionKeys =
      peerConnectionsRef && peerConnectionsRef.current
        ? Object.keys(peerConnectionsRef.current)
        : [];
    const state = useChatStore.getState();
    const fallbackPeers = Object.keys(state.connectionStates);
    const allPeers = Array.from(
      new Set([...peerConnectionKeys, ...fallbackPeers, ...connectedPeers]),
    );

    allPeers.forEach((addr) => {
      forceDisconnectPeer(addr);
    });

    const webrtcInitiatedRef = managerRefs.webrtcInitiated;
    if (webrtcInitiatedRef && webrtcInitiatedRef.current) {
      webrtcInitiatedRef.current = {};
    }

    const pingTimeoutRef = managerRefs.pingTimeoutRef;
    if (pingTimeoutRef && pingTimeoutRef.current) {
      Object.values(pingTimeoutRef.current).forEach((timeoutId: any) =>
        clearTimeout(timeoutId),
      );
      pingTimeoutRef.current = {};
    }

    const reconnectIntervalRef = managerRefs.reconnectIntervalRef;
    if (reconnectIntervalRef && reconnectIntervalRef.current) {
      Object.values(reconnectIntervalRef.current).forEach((intervalId: any) =>
        clearInterval(intervalId),
      );
      reconnectIntervalRef.current = {};
    }

    state.setActiveSessions([]);
    state.setActiveChat(null);
    state.setActiveUsername("");
    state.setConnectionStates({});

    authLogout();
    navigate("/login");
  }, [authLogout, connectedPeers, forceDisconnectPeer, navigate]);

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
    activeChat: chatStore.activeChat,
    activeUsername: chatStore.activeUsername,
    pendingRequests: chatStore.pendingRequests,
    activeSessions: chatStore.activeSessions,
    switchChat: handleSwitchChatWrapped,
    closeChat,
    isSearching: chatStore.isSearching,
    handleConnectPeer,
    handleAcceptRequest: handleAcceptRequestWrapped,
    handleRejectRequest,
    removeActiveSession,
    connectedPeers,
    isWebRTCConnected,
    connectionStates: chatStore.connectionStates,
    messages,
    searchError: chatStore.searchError,
    isPeerTyping: chatStore.isPeerTyping,
    resetWallet,
    unreadCount,
    unreadTotal,
    pendingRequestsTotal: chatStore.pendingRequests.length,
    entryPointId,
    scrollSettledRef,
    sendMarkAsRead,
    acceptContact,
    blockContact,
    archiveContact,
    unarchiveContact,
    forceDisconnectPeer,
    activeAreaView: chatStore.activeAreaView,
    setActiveAreaView: chatStore.setActiveAreaView,
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
