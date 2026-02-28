import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  ReactNode,
  useState,
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
import { useUIStore, useSessionStore, useWalletStore } from "@/store";

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
  const { socket, isConnected } = useSocket(token, activeRelay);
  const { ephemeralPublicKey, computeSecret, encrypt, decrypt, hasSecret } =
    useCrypto();

  const { showToast, setIsMobileSidebarOpen } = useUIStore();
  const { messageInput, setMessageInput, autoDeleteMode } = useSessionStore();
  const { peerWalletAddress, setPeerWalletAddress } = useWalletStore();

  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

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
    searchError,
    isPeerTyping,
    setIsPeerTyping,
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
    startVoiceCall,
    stopVoiceCall,
    toggleMicMute,
  } = useWebRTC({
    socket,
    myAddress: address,
    activeChat,
    decrypt,
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
  });

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
      } catch {
        /* ignore */
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

  useEffect(() => {
    const current = activeChat?.toLowerCase();
    if (current && !connectedPeers.includes(current))
      webrtcInitiated.current[current] = false;
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
            text: `[RECEIVED] Transfer Verified!\nTx Hash: ${payload.hash}`,
          });
        }
      } catch {
        /* ignore */
      }
    };
    checkIncomingForWalletRequests();
  }, [messages, activeChat, encrypt, sendDataViaWebRTC, setPeerWalletAddress]);

  /**
   * Dispatches a wallet address request to the active peer.
   * @returns {void}
   */
  const requestPeerWallet = (): void => {
    const currentChat = activeChat as string;
    if (!currentChat || !hasSecret(currentChat) || !isWebRTCConnected) return;
    const requestPayload = JSON.stringify({ type: "WALLET_REQUEST" });
    const encryptedPayload = encrypt(currentChat, requestPayload);
    if (encryptedPayload) sendDataViaWebRTC(currentChat, encryptedPayload);
  };

  /**
   * Executes a cryptocurrency transaction using MetaMask.
   * @param {string} amount - The amount of ETH to send.
   * @returns {Promise<void>}
   */
  const handleSendCrypto = async (amount: string): Promise<void> => {
    if (!peerWalletAddress)
      throw new Error("Peer wallet address not resolved yet.");
    if (typeof window.ethereum === "undefined")
      throw new Error("MetaMask is not installed.");
    const myMetaMask = localStorage.getItem("linked_metamask");
    if (!myMetaMask) throw new Error("Your MetaMask is not linked.");
    if (myMetaMask.toLowerCase() === peerWalletAddress.toLowerCase())
      throw new Error("Self-Transfer Blocked.");

    try {
      const chainIdHex = "0x539";
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: chainIdHex }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: chainIdHex,
                chainName: "Ganache Local",
                rpcUrls: ["http://127.0.0.1:7545"],
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              },
            ],
          });
        } else {
          throw switchError;
        }
      }

      const amountHex = ethers.parseEther(amount).toString(16);
      const transactionParameters = {
        to: peerWalletAddress,
        from: myMetaMask,
        value: `0x${amountHex}`,
      };
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [transactionParameters],
      });

      const currentChat = activeChat as string;
      const successPayload = JSON.stringify({
        type: "TX_SUCCESS",
        hash: txHash,
      });
      const encryptedSuccess = encrypt(currentChat, successPayload);

      if (encryptedSuccess) sendDataViaWebRTC(currentChat, encryptedSuccess);

      await db.messages.add({
        ownerAddress: address!.toLowerCase(),
        chatId: currentChat.toLowerCase(),
        text: `[SENT] ${amount} ETH\nTx Hash: ${txHash}`,
        isMine: true,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error("Direct MetaMask Transfer Error:", error);
      throw error;
    }
  };

  /**
   * Dispatches a text message over the active WebRTC data channel.
   * @param {React.SyntheticEvent} e - The form submission event.
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
      const payloadObj: any = { text: messageInput };

      const { replyingTo, setReplyingTo } = useSessionStore.getState();
      if (replyingTo) {
        payloadObj.replyTo = {
          id: replyingTo.id,
          text: replyingTo.text,
          isMine: replyingTo.isMine,
          timestamp: replyingTo.timestamp, // FIX: Inject Timestamp P2P Safe
        };
      }

      const stringifiedPayload = JSON.stringify(payloadObj);
      const encryptedMsg = encrypt(currentChat, stringifiedPayload);
      if (!encryptedMsg) throw new Error("Encryption failed");

      sendDataViaWebRTC(currentChat, encryptedMsg);

      await db.messages.add({
        ownerAddress: address.toLowerCase(),
        chatId: currentChat.toLowerCase(),
        text: stringifiedPayload,
        isMine: true,
        timestamp: Date.now(),
      });

      setMessageInput("");
      setReplyingTo(null);
    } catch {
      showToast("Failed to send message. Is WebRTC connected?", "error");
    }
  };

  /**
   * Processes and dispatches an image file over WebRTC.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The file input change event.
   * @returns {Promise<void>}
   */
  const handleSendImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    const currentChat = activeChat as string;
    if (!file || !currentChat || !isWebRTCConnected || !address) return;
    if (file.size > 1024 * 500) {
      showToast("File too large! Max 500KB for P2P.", "error");
      return;
    }

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
        showToast("Encryption failed.", "error");
      }
    };
    reader.readAsDataURL(file);
  };

  /**
   * Dispatches a document file payload over WebRTC.
   * @param {string} fileName - Original file name.
   * @param {string} base64 - Base64 encoded file data.
   * @returns {Promise<void>}
   */
  const handleSendDocument = async (
    fileName: string,
    base64: string,
  ): Promise<void> => {
    const currentChat = activeChat as string;
    if (
      !currentChat ||
      !hasSecret(currentChat) ||
      !isWebRTCConnected ||
      !address
    )
      return;

    try {
      const payloadObj = { type: "DOCUMENT", fileName, fileData: base64 };
      const stringifiedPayload = JSON.stringify(payloadObj);
      const encryptedDoc = encrypt(currentChat, stringifiedPayload);
      if (!encryptedDoc) throw new Error("Encryption failed");

      sendDataViaWebRTC(currentChat, encryptedDoc);

      await db.messages.add({
        ownerAddress: address.toLowerCase(),
        chatId: currentChat.toLowerCase(),
        text: stringifiedPayload,
        isMine: true,
        timestamp: Date.now(),
      });
    } catch {
      showToast("Document encryption failed.", "error");
    }
  };

  /**
   * Dispatches base64 image data captured from the local camera.
   * @param {string} base64 - Base64 encoded image data.
   * @returns {Promise<void>}
   */
  const handleSendCameraPhoto = async (base64: string): Promise<void> => {
    const currentChat = activeChat as string;
    if (
      !currentChat ||
      !hasSecret(currentChat) ||
      !isWebRTCConnected ||
      !address
    )
      return;

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
      showToast("Camera image encryption failed.", "error");
    }
  };

  /**
   * Dispatches recorded audio blob data.
   * @param {Blob} audioBlob - The recorded audio media blob.
   * @returns {Promise<void>}
   */
  const handleSendAudio = async (audioBlob: Blob): Promise<void> => {
    const currentChat = activeChat as string;
    if (!audioBlob || !currentChat || !isWebRTCConnected || !address) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Audio = `[AUDIO]${event.target?.result as string}`;
      try {
        const encryptedAudio = encrypt(currentChat, base64Audio);
        if (!encryptedAudio) throw new Error("Encryption failed");
        sendDataViaWebRTC(currentChat, encryptedAudio);
        await db.messages.add({
          ownerAddress: address.toLowerCase(),
          chatId: currentChat.toLowerCase(),
          text: base64Audio,
          isMine: true,
          timestamp: Date.now(),
        });
      } catch {
        showToast("Audio encryption failed.", "error");
      }
    };
    reader.readAsDataURL(audioBlob);
  };

  /**
   * Dispatches a silent typing status payload.
   * @returns {void}
   */
  const handleTyping = (): void => {
    const currentChat = activeChat as string;
    if (!currentChat || !isWebRTCConnected) return;
    const payload = JSON.stringify({ type: "TYPING" });
    const encryptedTyping = encrypt(currentChat, payload);
    if (encryptedTyping) sendDataViaWebRTC(currentChat, encryptedTyping);
  };

  /**
   * Triggers the voice call initiation process.
   * @returns {void}
   */
  const initiateCall = (): void => {
    const currentChat = activeChat as string;
    if (!currentChat || !isWebRTCConnected) return;
    const payload = JSON.stringify({ type: "CALL_OFFER" });
    const encryptedCall = encrypt(currentChat, payload);
    if (encryptedCall) {
      sendDataViaWebRTC(currentChat, encryptedCall);
      showToast("Calling...", "success");
    }
  };

  /**
   * Accepts an incoming voice call and establishes media streams.
   * @returns {Promise<void>}
   */
  const acceptCall = async (): Promise<void> => {
    const currentChat = activeChat as string;
    if (!currentChat || !isWebRTCConnected) return;

    const micStarted = await startVoiceCall(currentChat);
    if (!micStarted) {
      showToast("Microphone access needed.", "error");
      return;
    }

    const payload = JSON.stringify({ type: "CALL_ACCEPTED" });
    const encryptedAccept = encrypt(currentChat, payload);
    if (encryptedAccept) {
      sendDataViaWebRTC(currentChat, encryptedAccept);
      setIsIncomingCall(false);
      setIsInCall(true);
    }
  };

  /**
   * Declines an incoming voice call.
   * @returns {void}
   */
  const declineCall = (): void => {
    const currentChat = activeChat as string;
    if (!currentChat || !isWebRTCConnected) return;
    const payload = JSON.stringify({ type: "CALL_REJECTED" });
    const encryptedReject = encrypt(currentChat, payload);
    if (encryptedReject) {
      sendDataViaWebRTC(currentChat, encryptedReject);
      setIsIncomingCall(false);
    }
  };

  /**
   * Terminates an active voice call and releases media streams.
   * @returns {void}
   */
  const endCall = (): void => {
    const currentChat = activeChat as string;
    if (!currentChat) return;

    stopVoiceCall(currentChat);
    const payload = JSON.stringify({ type: "CALL_ENDED" });
    const encrypted = encrypt(currentChat, payload);
    if (encrypted && isWebRTCConnected) {
      sendDataViaWebRTC(currentChat, encrypted);
    }
    setIsInCall(false);
    setIsIncomingCall(false);
    setIsMuted(false);
  };

  /**
   * Toggles local microphone mute status during an active call.
   * @returns {void}
   */
  const toggleMute = (): void => {
    const mutedStatus = toggleMicMute();
    setIsMuted(mutedStatus);
  };

  /**
   * Wraps switch chat handler with cleanup operations.
   * @param {any} session - Target session data.
   * @returns {void}
   */
  const handleSwitchChatWrapped = (session: any): void => {
    switchChat(session);
    setPeerWalletAddress(null);
    setIsMobileSidebarOpen(false);
  };

  /**
   * Wraps accept request handler with cleanup operations.
   * @param {any} req - Target request data.
   * @returns {void}
   */
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
    isSearching,
    handleConnectPeer,
    handleAcceptRequest: handleAcceptRequestWrapped,
    handleRejectRequest,
    connectedPeers,
    isWebRTCConnected,
    messages: messages || [],
    handleSendMessage,
    handleSendImage,
    handleSendAudio,
    handleSendDocument,
    handleSendCameraPhoto,
    resetWallet,
    requestPeerWallet,
    handleSendCrypto,
    searchError,
    isPeerTyping,
    handleTyping,
    isIncomingCall,
    isInCall,
    isMuted,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined)
    throw new Error("useChatContext must be used within a ChatProvider");
  return context;
};
