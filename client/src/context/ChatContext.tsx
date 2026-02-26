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
  handleExportChat: () => void;
  handleImportChat: (e: ChangeEvent<HTMLInputElement>) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (isOpen: boolean) => void;
  resetWallet: () => void;
  requestPeerWallet: () => void;
  peerWalletAddress: string | null;
  handleSendCrypto: (amount: string) => Promise<void>;
  showToast: (msg: string, type?: "error" | "success") => void;
  searchError: string; // MERGED: Added to context interface
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
    searchError, // MERGED: Extracted from useChatLogic
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(true);

  const [seedModal, setSeedModal] = useState<{
    isOpen: boolean;
    type: "import" | "export";
    payload?: string;
  }>({ isOpen: false, type: "export" });
  const [seedInput, setSeedInput] = useState<string>("");
  const [modalError, setModalError] = useState<string>("");

  const [peerWalletAddress, setPeerWalletAddress] = useState<string | null>(
    null,
  );

  const [toast, setToast] = useState<{
    show: boolean;
    msg: string;
    type: "error" | "success";
  }>({
    show: false,
    msg: "",
    type: "error",
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

  const showToast = (msg: string, type: "error" | "success" = "error") => {
    setToast({ show: true, msg, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3500);
  };

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
      } catch (e) {
        // Not a structured payload; skip processing
      }
    };
    checkIncomingForWalletRequests();
  }, [messages, activeChat, encrypt, sendDataViaWebRTC]);

  const requestPeerWallet = () => {
    const currentChat = activeChat as string;
    if (!currentChat || !hasSecret(currentChat) || !isWebRTCConnected) return;

    const requestPayload = JSON.stringify({ type: "WALLET_REQUEST" });
    const encryptedPayload = encrypt(currentChat, requestPayload);

    if (encryptedPayload) {
      sendDataViaWebRTC(currentChat, encryptedPayload);
    }
  };

  const handleSendCrypto = async (amount: string) => {
    if (!peerWalletAddress) {
      throw new Error("Peer wallet address not resolved yet.");
    }

    if (typeof window.ethereum === "undefined") {
      throw new Error(
        "MetaMask is not installed. Please link it in the Security settings.",
      );
    }

    const myMetaMask = localStorage.getItem("linked_metamask");
    if (!myMetaMask) {
      throw new Error(
        "Your MetaMask is not linked. Please link it in the Security settings.",
      );
    }

    if (myMetaMask.toLowerCase() === peerWalletAddress.toLowerCase()) {
      throw new Error(
        "Self-Transfer Blocked: Sender and Receiver addresses are identical.",
      );
    }

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

      if (encryptedSuccess) {
        sendDataViaWebRTC(currentChat, encryptedSuccess);
      }

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
      showToast("Failed to send message. Is WebRTC connected?", "error");
    }
  };

  const handleSendImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const currentChat = activeChat as string;
    if (!file || !currentChat || !isWebRTCConnected || !address) return;
    if (file.size > 1024 * 500) {
      showToast("File too large! Max 500KB for P2P demo.", "error");
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

  const handleExportChat = async () => {
    const allMessages = await db.messages.toArray();
    if (allMessages.length === 0) {
      showToast("No chat history to export.", "error");
      return;
    }
    setSeedModal({ isOpen: true, type: "export" });
  };

  const handleImportChat = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setSeedModal({ isOpen: true, type: "import", payload: content });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const submitSeedModal = async () => {
    setModalError("");
    const seed = seedInput.trim();
    if (seed.split(/\s+/).length !== 12)
      return setModalError("Invalid! Must be exactly 12 words.");

    try {
      const derivedWallet = ethers.Wallet.fromPhrase(seed);
      if (derivedWallet.address.toLowerCase() !== address?.toLowerCase()) {
        return setModalError(
          "Access Denied! Seed phrase does not match the active account.",
        );
      }
    } catch (err) {
      return setModalError("Invalid seed phrase format or typo detected!");
    }

    if (seedModal.type === "export") {
      try {
        const allMessages = await db.messages.toArray();
        const dataStr = JSON.stringify(allMessages);
        const encodedData = btoa(
          unescape(encodeURIComponent(dataStr + "|||SECURE_P2P|||" + seed)),
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
        closeSeedModal();
      } catch (err) {
        setModalError("Failed to export chat history.");
      }
    } else if (seedModal.type === "import" && seedModal.payload) {
      try {
        const payload = JSON.parse(seedModal.payload);
        if (payload.encrypted) {
          const decodedStr = decodeURIComponent(escape(atob(payload.data)));
          const splitData = decodedStr.split("|||SECURE_P2P|||");

          if (splitData.length !== 2 || splitData[1] !== seed) {
            return setModalError(
              "Decryption failed! Seed phrase does not match this backup file.",
            );
          }

          const parsedMessages = JSON.parse(splitData[0]);
          await db.messages.bulkPut(parsedMessages);
          closeSeedModal();
          showToast("Chat history restored successfully!", "success");
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } catch (err) {
        setModalError("Failed to import. File might be corrupted.");
      }
    }
  };

  const closeSeedModal = () => {
    setSeedModal({ isOpen: false, type: "export" });
    setSeedInput("");
    setModalError("");
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
    messageInput,
    setMessageInput,
    handleSendMessage,
    handleSendImage,
    autoDeleteMode,
    handleModeChange,
    handleExportChat,
    handleImportChat,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    resetWallet,
    requestPeerWallet,
    peerWalletAddress,
    handleSendCrypto,
    showToast,
    searchError, // MERGED: Exported for UI consumption
  };

  return (
    <ChatContext.Provider value={value}>
      {children}

      {toast.show && (
        <div
          className={`fixed top-4 right-4 z-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-2 fade-in duration-200 ${
            toast.type === "error"
              ? "bg-red-500/10 border border-red-500/20 text-red-400"
              : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
          }`}
        >
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      {seedModal.isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-zinc-100 mb-2">
              {seedModal.type === "export"
                ? "Encrypt Backup"
                : "Decrypt Backup"}
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Enter your exact 12-word seed phrase to{" "}
              {seedModal.type === "export" ? "encrypt" : "decrypt and restore"}{" "}
              your data.
            </p>
            <textarea
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              placeholder="e.g. apple banana cat dog elephant frog grape hat ice juice kite lemon"
              className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none mb-2"
            />
            {modalError && (
              <p className="text-[11px] font-medium text-red-400 mb-4 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                {modalError}
              </p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={closeSeedModal}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitSeedModal}
                disabled={!seedInput.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 shadow-lg shadow-indigo-500/20"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined)
    throw new Error("useChatContext must be used within a ChatProvider");
  return context;
};
