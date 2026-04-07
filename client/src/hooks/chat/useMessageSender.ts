import { db } from "@/utils/db";
import { useSessionStore } from "@/store";
import {
  transferViaInjectedProvider,
  transferViaInternalWallet,
} from "@/utils/transaction";

declare global {
  interface Window {
    ethereum?: any;
  }
}

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
      const payloadObj: Record<string, any> = { text: messageInput };

      if (replyingTo) {
        payloadObj.replyTo = {
          id: replyingTo.id,
          text: replyingTo.text,
          isMine: replyingTo.isMine,
          timestamp: replyingTo.timestamp,
        };
      }

      const stringifiedPayload = JSON.stringify(payloadObj);
      const encryptedMsg = encrypt(activeChat, stringifiedPayload);

      if (!encryptedMsg) throw new Error("Encryption failed");

      sendDataViaWebRTC(activeChat, encryptedMsg);

      await db.messages.add({
        ownerAddress: address.toLowerCase(),
        chatId: activeChat.toLowerCase(),
        text: encryptLocalDB(stringifiedPayload),
        isMine: true,
        timestamp: Date.now(),
      });

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

    if (file.size > 1024 * 500) {
      showToast("File too large! Max 500KB for P2P.", "error");
      return;
    }

    const reader = new FileReader();

    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const encryptedImage = encrypt(activeChat, base64);
        if (!encryptedImage) throw new Error("Encryption failed");

        sendDataViaWebRTC(activeChat, encryptedImage);

        await db.messages.add({
          ownerAddress: address.toLowerCase(),
          chatId: activeChat.toLowerCase(),
          text: encryptLocalDB(base64),
          isMine: true,
          timestamp: Date.now(),
          isImage: true,
        });
      } catch (err) {
        console.error("[Message Sender] Image send error:", err);
        showToast("Encryption failed.", "error");
      }
    };
    reader.readAsDataURL(file);
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

      const encryptedDoc = encrypt(activeChat, stringifiedPayload);
      if (!encryptedDoc) throw new Error("Encryption failed");

      sendDataViaWebRTC(activeChat, encryptedDoc);

      await db.messages.add({
        ownerAddress: address.toLowerCase(),
        chatId: activeChat.toLowerCase(),
        text: encryptLocalDB(stringifiedPayload),
        isMine: true,
        timestamp: Date.now(),
      });
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
      const encryptedImage = encrypt(activeChat, base64);
      if (!encryptedImage) throw new Error("Encryption failed");

      sendDataViaWebRTC(activeChat, encryptedImage);

      await db.messages.add({
        ownerAddress: address.toLowerCase(),
        chatId: activeChat.toLowerCase(),
        text: encryptLocalDB(base64),
        isMine: true,
        timestamp: Date.now(),
        isImage: true,
      });
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

    const reader = new FileReader();

    reader.onload = async (event) => {
      const base64Audio = `[AUDIO]${event.target?.result as string}`;
      try {
        const encryptedAudio = encrypt(activeChat, base64Audio);
        if (!encryptedAudio) throw new Error("Encryption failed");

        sendDataViaWebRTC(activeChat, encryptedAudio);

        await db.messages.add({
          ownerAddress: address.toLowerCase(),
          chatId: activeChat.toLowerCase(),
          text: encryptLocalDB(base64Audio),
          isMine: true,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error("[Message Sender] Audio send error:", err);
        showToast("Audio encryption failed.", "error");
      }
    };
    reader.readAsDataURL(audioBlob);
  };

  /**
   * Sends a typing indicator signal to the active peer.
   *
   * @returns {void}
   */
  const handleTyping = (): void => {
    if (!activeChat || !isWebRTCConnected) return;

    const payload = JSON.stringify({ type: "TYPING" });
    const encryptedTyping = encrypt(activeChat, payload);

    if (encryptedTyping) {
      sendDataViaWebRTC(activeChat, encryptedTyping);
    }
  };

  /**
   * Dispatches a request to the peer asking for their transaction wallet address.
   *
   * @returns {void}
   */
  const requestPeerWallet = (): void => {
    if (!activeChat || !hasSecret(activeChat) || !isWebRTCConnected) return;

    const requestPayload = JSON.stringify({ type: "WALLET_REQUEST" });
    const encryptedPayload = encrypt(activeChat, requestPayload);

    if (encryptedPayload) {
      sendDataViaWebRTC(activeChat, encryptedPayload);
    }
  };

  /**
   * Initiates an Ethereum transaction to the peer's resolved wallet address.
   * Dynamically routes the transaction through either the internal wallet or the injected MetaMask provider.
   *
   * @param {string} amount - The amount of ETH to transfer.
   * @returns {Promise<void>}
   */
  const handleSendCrypto = async (amount: string): Promise<void> => {
    if (!peerWalletAddress) {
      throw new Error("Peer wallet address not resolved yet.");
    }

    const encryptedPk = localStorage.getItem("internal_tx_pk");
    const internalPk = encryptedPk ? decryptLocalDB(encryptedPk) : null;
    const externalAddress = localStorage.getItem("linked_metamask");

    if (!internalPk && !externalAddress) {
      throw new Error(
        "No transaction wallet configured. Please link a wallet in Security Settings.",
      );
    }

    if (
      (externalAddress &&
        externalAddress.toLowerCase() === peerWalletAddress.toLowerCase()) ||
      localStorage.getItem("internal_tx_wallet")?.toLowerCase() ===
        peerWalletAddress.toLowerCase()
    ) {
      throw new Error(
        "Self-Transfer Blocked. You cannot send crypto to yourself.",
      );
    }

    try {
      let txHash = "";

      if (internalPk) {
        const rpcUrl = import.meta.env.VITE_RPC_URL || "http://127.0.0.1:7545";
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
        type: "TX_SUCCESS",
        hash: txHash,
      });

      const encryptedSuccess = encrypt(activeChat as string, successPayload);
      if (encryptedSuccess) {
        sendDataViaWebRTC(activeChat as string, encryptedSuccess);
      }

      await db.messages.add({
        ownerAddress: (address as string).toLowerCase(),
        chatId: (activeChat as string).toLowerCase(),
        text: encryptLocalDB(`[SENT] ${amount} ETH\nTx Hash: ${txHash}`),
        isMine: true,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      console.error("[Message Sender] Transaction failed:", err);
      showToast(err.message || "Crypto transfer failed", "error");
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
