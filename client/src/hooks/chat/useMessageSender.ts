import { db } from "@/utils/storage/db";
import { useSessionStore } from "@/store";
import { type ReplyMessage } from "@/store/useSessionStore";
import { getStoredWalletAddresses } from "@/services/walletBalanceService";
import {
  INTERNAL_TX_PRIVATE_KEY_STORAGE_KEY,
  resolveRpcUrl,
} from "@/services/web3WalletService";
import { CHAT_PROTOCOL_TYPES } from "@/utils/chat/chatProtocol";
import {
  transferViaInjectedProvider,
  transferViaInternalWallet,
} from "@/utils/commerce/transaction";

const MAX_P2P_FILE_SIZE_BYTES = 500 * 1024;
const AUDIO_PREFIX = "[AUDIO]";

type TextMessagePayload = {
  text: string;
  replyTo?: ReplyMessage;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

const readAsDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        resolve(result);
        return;
      }

      reject(new Error("Failed to read file data."));
    };
    reader.onerror = () => reject(new Error("Failed to read file data."));
    reader.readAsDataURL(file);
  });

/**
 * Interface defining the dependencies required by the useMessageSender hook.
 */
export interface UseMessageSenderParams {
  address: string | null;
  activeChat: string | null;
  isWebRTCConnected: boolean;
  hasSecret: (peerAddress: string) => boolean;
  encrypt: (peerAddress: string, plainText: string) => string | null;
  encryptLocalDB: (plainText: string) => string;
  decryptLocalDB: (cipherText: string) => string;
  sendDataViaWebRTC: (peerAddress: string, payload: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  peerWalletAddress: string | null;
}

/**
 * Interface defining the return methods for dispatching various message types.
 */
export interface UseMessageSenderReturn {
  handleSendMessage: (e: React.SyntheticEvent) => Promise<void>;
  handleSendImage: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleSendDocument: (fileName: string, base64: string) => Promise<void>;
  handleSendCameraPhoto: (base64: string) => Promise<void>;
  handleSendAudio: (audioBlob: Blob) => Promise<void>;
  handleTyping: () => void;
  requestPeerWallet: () => void;
  handleSendCrypto: (amount: string) => Promise<void>;
}

/**
 * Custom hook to handle formatting, encrypting, and dispatching various message types.
 *
 * @param {UseMessageSenderParams} params - Dependencies for messaging and crypto operations.
 * @returns {UseMessageSenderReturn} Message handler functions.
 */
export const useMessageSender = ({
  address,
  activeChat,
  isWebRTCConnected,
  hasSecret,
  encrypt,
  encryptLocalDB,
  decryptLocalDB,
  sendDataViaWebRTC,
  showToast,
  peerWalletAddress,
}: UseMessageSenderParams): UseMessageSenderReturn => {
  const { messageInput, setMessageInput, replyingTo, setReplyingTo } =
    useSessionStore();

  const addOutgoingMessage = async (
    chatId: string,
    ownerAddress: string,
    encryptedText: string,
    isImage?: boolean,
  ): Promise<void> => {
    await db.messages.add({
      ownerAddress: ownerAddress.toLowerCase(),
      chatId: chatId.toLowerCase(),
      text: encryptLocalDB(encryptedText),
      isMine: true,
      timestamp: Date.now(),
      ...(isImage ? { isImage: true } : {}),
      status: isWebRTCConnected ? "delivered" : "pending",
    });
  };

  const encryptAndSendPayload = (chatId: string, payload: string): boolean => {
    const encryptedPayload = encrypt(chatId, payload);

    if (!encryptedPayload) {
      return false;
    }

    sendDataViaWebRTC(chatId, encryptedPayload);
    return true;
  };

  /**
   * Encrypts and sends a text message via WebRTC.
   *
   * @param {React.SyntheticEvent} e - Form submission event.
   * @returns {Promise<void>}
   */
  const handleSendMessage = async (e: React.SyntheticEvent): Promise<void> => {
    e.preventDefault();
    if (
      !messageInput.trim() ||
      !activeChat ||
      !hasSecret(activeChat) ||
      !isWebRTCConnected ||
      !address
    )
      return;

    try {
      const payloadObj: TextMessagePayload = { text: messageInput };

      if (replyingTo) {
        payloadObj.replyTo = replyingTo;
      }

      const stringifiedPayload = JSON.stringify(payloadObj);
      const wasSent = encryptAndSendPayload(activeChat, stringifiedPayload);
      if (!wasSent) throw new Error("Encryption failed");

      await addOutgoingMessage(activeChat, address, stringifiedPayload);

      setMessageInput("");
      setReplyingTo(null);
    } catch (err) {
      console.error("[Message Sender] Text send error:", err);
      showToast("Failed to send message. Is WebRTC connected?", "error");
    }
  };

  /**
   * Reads an image file, encrypts it as Base64, and sends it via WebRTC.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e - File input change event.
   * @returns {Promise<void>}
   */
  const handleSendImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file || !activeChat || !isWebRTCConnected || !address) return;

    if (file.size > MAX_P2P_FILE_SIZE_BYTES) {
      showToast("File too large! Max 500KB for P2P.", "error");
      return;
    }

    try {
      const base64 = await readAsDataUrl(file);
      const wasSent = encryptAndSendPayload(activeChat, base64);
      if (!wasSent) throw new Error("Encryption failed");

      await addOutgoingMessage(activeChat, address, base64, true);
    } catch (err) {
      console.error("[Message Sender] Image send error:", err);
      showToast("Encryption failed.", "error");
    }
  };

  /**
   * Encrypts and sends a document file via WebRTC.
   *
   * @param {string} fileName - The name of the file.
   * @param {string} base64 - The Base64 representation of the document.
   * @returns {Promise<void>}
   */
  const handleSendDocument = async (
    fileName: string,
    base64: string,
  ): Promise<void> => {
    if (!activeChat || !hasSecret(activeChat) || !isWebRTCConnected || !address)
      return;

    try {
      const payloadObj = { type: "DOCUMENT", fileName, fileData: base64 };
      const stringifiedPayload = JSON.stringify(payloadObj);

      const wasSent = encryptAndSendPayload(activeChat, stringifiedPayload);
      if (!wasSent) throw new Error("Encryption failed");

      await addOutgoingMessage(activeChat, address, stringifiedPayload);
    } catch (err) {
      console.error("[Message Sender] Document send error:", err);
      showToast("Document encryption failed.", "error");
    }
  };

  /**
   * Encrypts and sends an image captured directly from the camera via WebRTC.
   *
   * @param {string} base64 - The Base64 string of the captured photo.
   * @returns {Promise<void>}
   */
  const handleSendCameraPhoto = async (base64: string): Promise<void> => {
    if (!activeChat || !hasSecret(activeChat) || !isWebRTCConnected || !address)
      return;

    try {
      const wasSent = encryptAndSendPayload(activeChat, base64);
      if (!wasSent) throw new Error("Encryption failed");

      await addOutgoingMessage(activeChat, address, base64, true);
    } catch (err) {
      console.error("[Message Sender] Camera photo send error:", err);
      showToast("Camera image encryption failed.", "error");
    }
  };

  /**
   * Encrypts and sends a recorded audio blob via WebRTC.
   *
   * @param {Blob} audioBlob - The recorded audio data.
   * @returns {Promise<void>}
   */
  const handleSendAudio = async (audioBlob: Blob): Promise<void> => {
    if (!audioBlob || !activeChat || !isWebRTCConnected || !address) return;

    try {
      const encodedAudio = await readAsDataUrl(audioBlob);
      const base64Audio = `${AUDIO_PREFIX}${encodedAudio}`;
      const wasSent = encryptAndSendPayload(activeChat, base64Audio);
      if (!wasSent) throw new Error("Encryption failed");

      await addOutgoingMessage(activeChat, address, base64Audio);
    } catch (err) {
      console.error("[Message Sender] Audio send error:", err);
      showToast("Audio encryption failed.", "error");
    }
  };

  /**
   * Sends a typing indicator signal to the active peer.
   *
   * @returns {void}
   */
  const handleTyping = (): void => {
    if (!activeChat || !isWebRTCConnected) return;

    const payload = JSON.stringify({ type: CHAT_PROTOCOL_TYPES.typing });
    encryptAndSendPayload(activeChat, payload);
  };

  /**
   * Dispatches a request to the peer asking for their transaction wallet address.
   *
   * @returns {void}
   */
  const requestPeerWallet = (): void => {
    if (!activeChat || !hasSecret(activeChat) || !isWebRTCConnected) return;

    const requestPayload = JSON.stringify({
      type: CHAT_PROTOCOL_TYPES.walletRequest,
    });
    encryptAndSendPayload(activeChat, requestPayload);
  };

  /**
   * Initiates an Ethereum transaction to the peer's resolved wallet address.
   * Dynamically routes the transaction through either the internal wallet or the injected MetaMask provider.
   *
   * @param {string} amount - The amount of ETH to transfer.
   * @returns {Promise<void>}
   */
  const handleSendCrypto = async (amount: string): Promise<void> => {
    if (!peerWalletAddress || !activeChat || !address) {
      throw new Error("Peer wallet address not resolved yet.");
    }

    const encryptedPk = localStorage.getItem(
      INTERNAL_TX_PRIVATE_KEY_STORAGE_KEY,
    );
    const internalPk = encryptedPk ? decryptLocalDB(encryptedPk) : null;
    const { internalAddress, externalAddress } = getStoredWalletAddresses();

    if (!internalPk && !externalAddress) {
      throw new Error(
        "No transaction wallet configured. Please link a wallet in Security Settings.",
      );
    }

    if (
      (externalAddress &&
        externalAddress.toLowerCase() === peerWalletAddress.toLowerCase()) ||
      internalAddress?.toLowerCase() === peerWalletAddress.toLowerCase()
    ) {
      throw new Error(
        "Self-Transfer Blocked. You cannot send crypto to yourself.",
      );
    }

    try {
      let txHash = "";

      if (internalPk) {
        const rpcUrl = resolveRpcUrl();
        txHash = await transferViaInternalWallet(
          internalPk,
          peerWalletAddress,
          amount,
          rpcUrl,
        );
      } else if (externalAddress) {
        txHash = await transferViaInjectedProvider(peerWalletAddress, amount);
      }

      const successPayload = JSON.stringify({
        type: CHAT_PROTOCOL_TYPES.txSuccess,
        hash: txHash,
      });

      encryptAndSendPayload(activeChat, successPayload);

      await db.messages.add({
        ownerAddress: address.toLowerCase(),
        chatId: activeChat.toLowerCase(),
        text: encryptLocalDB(`[SENT] ${amount} ETH\nTx Hash: ${txHash}`),
        isMine: true,
        timestamp: Date.now(),
        status: "delivered",
      });
    } catch (err: unknown) {
      console.error("[Message Sender] Transaction failed:", err);
      showToast(getErrorMessage(err, "Crypto transfer failed"), "error");
      throw err;
    }
  };

  return {
    handleSendMessage,
    handleSendImage,
    handleSendDocument,
    handleSendCameraPhoto,
    handleSendAudio,
    handleTyping,
    requestPeerWallet,
    handleSendCrypto,
  };
};
