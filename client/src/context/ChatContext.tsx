import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
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
import { useUIStore, useSessionStore, useWalletStore } from "@/store";

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
  } = useWebRTC({
    socket,
    myAddress: address,
    activeChat,
    decrypt,
    setIsPeerTyping,
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
      } catch (err) {}
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
      } catch (e) {}
    };
    checkIncomingForWalletRequests();
  }, [messages, activeChat, encrypt, sendDataViaWebRTC, setPeerWalletAddress]);

  const requestPeerWallet = () => {
    const currentChat = activeChat as string;
    if (!currentChat || !hasSecret(currentChat) || !isWebRTCConnected) return;
    const requestPayload = JSON.stringify({ type: "WALLET_REQUEST" });
    const encryptedPayload = encrypt(currentChat, requestPayload);
    if (encryptedPayload) sendDataViaWebRTC(currentChat, encryptedPayload);
  };

  const handleSendCrypto = async (amount: string) => {
    if (!peerWalletAddress)
      throw new Error("Peer wallet address not resolved yet.");
    if (typeof window.ethereum === "undefined")
      throw new Error(
        "MetaMask is not installed. Please link it in the Security settings.",
      );
    const myMetaMask = localStorage.getItem("linked_metamask");
    if (!myMetaMask)
      throw new Error(
        "Your MetaMask is not linked. Please link it in the Security settings.",
      );
    if (myMetaMask.toLowerCase() === peerWalletAddress.toLowerCase())
      throw new Error(
        "Self-Transfer Blocked: Sender and Receiver addresses are identical.",
      );

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

  const handleSendImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
   * Processes and dispatches document files.
   * @param {string} fileName - File name string.
   * @param {string} base64 - Base64 encoded file data.
   * @returns {Promise<void>}
   */
  const handleSendDocument = async (fileName: string, base64: string) => {
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
   * Processes and dispatches base64 image data directly from camera.
   * @param {string} base64 - Base64 encoded image string.
   * @returns {Promise<void>}
   */
  const handleSendCameraPhoto = async (base64: string) => {
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

  const handleSendAudio = async (audioBlob: Blob) => {
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

  const handleTyping = () => {
    const currentChat = activeChat as string;
    if (!currentChat || !isWebRTCConnected) return;

    const payload = JSON.stringify({ type: "TYPING" });
    const encryptedTyping = encrypt(currentChat, payload);
    if (encryptedTyping) {
      sendDataViaWebRTC(currentChat, encryptedTyping);
    }
  };

  const handleSwitchChatWrapped = (session: any) => {
    switchChat(session);
    setPeerWalletAddress(null);
    setIsMobileSidebarOpen(false);
  };

  const handleAcceptRequestWrapped = (req: any) => {
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
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined)
    throw new Error("useChatContext must be used within a ChatProvider");
  return context;
};
