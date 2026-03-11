import { ethers } from "ethers";
import { db } from "@/utils/db";
import { useSessionStore } from "@/store";

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
 * Custom hook to handle formatting, encrypting, and dispatching various message types
 * (Text, Image, Document, Audio, Crypto) over WebRTC and saving them locally.
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
  sendDataViaWebRTC,
  showToast,
  peerWalletAddress,
}: UseMessageSenderParams): UseMessageSenderReturn => {
  const { messageInput, setMessageInput, replyingTo, setReplyingTo } =
    useSessionStore();

  /**
   * Encrypts and sends a text message (and optional reply context) via WebRTC.
   * @param {React.SyntheticEvent} e - Form submission event.
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
      console.log("[Message Sender] Processing text message payload...");
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

      console.log("[Message Sender] Transmitting encrypted text via WebRTC.");
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
    } catch (error) {
      console.error(
        "[Message Sender Error] Failed to send text message:",
        error,
      );
      showToast("Failed to send message. Is WebRTC connected?", "error");
    }
  };

  /**
   * Reads an image file, encrypts it as Base64, and sends it via WebRTC.
   * @param {React.ChangeEvent<HTMLInputElement>} e - File input change event.
   */
  const handleSendImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file || !activeChat || !isWebRTCConnected || !address) return;

    if (file.size > 1024 * 500) {
      console.warn(
        "[Message Sender] Image rejected due to size constraint (Max 500KB).",
      );
      showToast("File too large! Max 500KB for P2P.", "error");
      return;
    }

    console.log(`[Message Sender] Reading image file: ${file.name}`);
    const reader = new FileReader();

    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const encryptedImage = encrypt(activeChat, base64);
        if (!encryptedImage) throw new Error("Encryption failed");

        console.log(
          "[Message Sender] Transmitting encrypted image via WebRTC.",
        );
        sendDataViaWebRTC(activeChat, encryptedImage);

        await db.messages.add({
          ownerAddress: address.toLowerCase(),
          chatId: activeChat.toLowerCase(),
          text: encryptLocalDB(base64),
          isMine: true,
          timestamp: Date.now(),
          isImage: true,
        });
      } catch (error) {
        console.error("[Message Sender Error] Failed to process image:", error);
        showToast("Encryption failed.", "error");
      }
    };
    reader.readAsDataURL(file);
  };

  /**
   * Encrypts and sends a document file via WebRTC.
   * @param {string} fileName - The name of the file.
   * @param {string} base64 - The Base64 representation of the document.
   */
  const handleSendDocument = async (
    fileName: string,
    base64: string,
  ): Promise<void> => {
    if (!activeChat || !hasSecret(activeChat) || !isWebRTCConnected || !address)
      return;

    try {
      console.log(`[Message Sender] Processing document: ${fileName}`);
      const payloadObj = { type: "DOCUMENT", fileName, fileData: base64 };
      const stringifiedPayload = JSON.stringify(payloadObj);

      const encryptedDoc = encrypt(activeChat, stringifiedPayload);
      if (!encryptedDoc) throw new Error("Encryption failed");

      console.log(
        "[Message Sender] Transmitting encrypted document via WebRTC.",
      );
      sendDataViaWebRTC(activeChat, encryptedDoc);

      await db.messages.add({
        ownerAddress: address.toLowerCase(),
        chatId: activeChat.toLowerCase(),
        text: encryptLocalDB(stringifiedPayload),
        isMine: true,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("[Message Sender Error] Failed to send document:", error);
      showToast("Document encryption failed.", "error");
    }
  };

  /**
   * Encrypts and sends an image captured directly from the camera via WebRTC.
   * @param {string} base64 - The Base64 string of the captured photo.
   */
  const handleSendCameraPhoto = async (base64: string): Promise<void> => {
    if (!activeChat || !hasSecret(activeChat) || !isWebRTCConnected || !address)
      return;

    try {
      console.log("[Message Sender] Processing camera capture payload.");
      const encryptedImage = encrypt(activeChat, base64);
      if (!encryptedImage) throw new Error("Encryption failed");

      console.log(
        "[Message Sender] Transmitting encrypted camera photo via WebRTC.",
      );
      sendDataViaWebRTC(activeChat, encryptedImage);

      await db.messages.add({
        ownerAddress: address.toLowerCase(),
        chatId: activeChat.toLowerCase(),
        text: encryptLocalDB(base64),
        isMine: true,
        timestamp: Date.now(),
        isImage: true,
      });
    } catch (error) {
      console.error(
        "[Message Sender Error] Failed to send camera photo:",
        error,
      );
      showToast("Camera image encryption failed.", "error");
    }
  };

  /**
   * Encrypts and sends a recorded audio blob via WebRTC.
   * @param {Blob} audioBlob - The recorded audio data.
   */
  const handleSendAudio = async (audioBlob: Blob): Promise<void> => {
    if (!audioBlob || !activeChat || !isWebRTCConnected || !address) return;

    console.log("[Message Sender] Processing audio blob.");
    const reader = new FileReader();

    reader.onload = async (event) => {
      const base64Audio = `[AUDIO]${event.target?.result as string}`;
      try {
        const encryptedAudio = encrypt(activeChat, base64Audio);
        if (!encryptedAudio) throw new Error("Encryption failed");

        console.log(
          "[Message Sender] Transmitting encrypted audio via WebRTC.",
        );
        sendDataViaWebRTC(activeChat, encryptedAudio);

        await db.messages.add({
          ownerAddress: address.toLowerCase(),
          chatId: activeChat.toLowerCase(),
          text: encryptLocalDB(base64Audio),
          isMine: true,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("[Message Sender Error] Failed to send audio:", error);
        showToast("Audio encryption failed.", "error");
      }
    };
    reader.readAsDataURL(audioBlob);
  };

  /**
   * Sends a typing indicator signal to the active peer.
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
   * Dispatches a request to the peer asking for their MetaMask wallet address.
   */
  const requestPeerWallet = (): void => {
    if (!activeChat || !hasSecret(activeChat) || !isWebRTCConnected) return;

    console.log(
      `[Message Sender] Requesting wallet address from peer: ${activeChat}`,
    );
    const requestPayload = JSON.stringify({ type: "WALLET_REQUEST" });
    const encryptedPayload = encrypt(activeChat, requestPayload);

    if (encryptedPayload) {
      sendDataViaWebRTC(activeChat, encryptedPayload);
    }
  };

  /**
   * Initiates an Ethereum transaction via MetaMask to the peer's resolved wallet address.
   * Automatically attempts to switch to or add the required network (e.g., Ganache).
   *
   * @param {string} amount - The amount of ETH to transfer.
   */
  const handleSendCrypto = async (amount: string): Promise<void> => {
    console.log(`[Crypto Transfer] Initiating transfer of ${amount} ETH.`);

    if (!peerWalletAddress)
      throw new Error("Peer wallet address not resolved yet.");
    if (typeof window.ethereum === "undefined")
      throw new Error("MetaMask is not installed.");

    const myMetaMask = localStorage.getItem("linked_metamask");
    if (!myMetaMask) throw new Error("Your MetaMask is not linked.");

    if (myMetaMask.toLowerCase() === peerWalletAddress.toLowerCase()) {
      throw new Error("Self-Transfer Blocked.");
    }

    try {
      const chainIdHex = "0x539"; // Ganache Local network chain ID

      console.log("[Crypto Transfer] Verifying MetaMask network chain.");
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: chainIdHex }],
        });
      } catch (switchError: any) {
        // Error code 4902 indicates that the chain has not been added to MetaMask.
        if (switchError.code === 4902) {
          console.log(
            "[Crypto Transfer] Network not found. Prompting user to add Ganache Local.",
          );
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

      console.log(
        "[Crypto Transfer] Network confirmed. Prompting transaction signature.",
      );
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

      console.log(`[Crypto Transfer] Transaction dispatched. Hash: ${txHash}`);

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
    } catch (error: any) {
      console.error(
        "[Crypto Transfer Error] Direct MetaMask Transfer Failed:",
        error,
      );
      throw error;
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
