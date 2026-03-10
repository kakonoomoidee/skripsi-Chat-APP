import { ethers } from "ethers";
import { db } from "@/utils/db";
import { useSessionStore } from "@/store";

declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * Hook to handle formatting and dispatching various message types (Text, Image, Crypto, etc.)
 * @param {any} params - Dependencies for messaging and crypto operations.
 * @returns {object} Message handler functions.
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
}: any) => {
  const { messageInput, setMessageInput, replyingTo, setReplyingTo } =
    useSessionStore();

  const handleSendMessage = async (e: React.SyntheticEvent) => {
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
      const payloadObj: any = { text: messageInput };
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
    } catch {
      showToast("Failed to send message. Is WebRTC connected?", "error");
    }
  };

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
      } catch {
        showToast("Encryption failed.", "error");
      }
    };
    reader.readAsDataURL(file);
  };

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
    } catch {
      showToast("Document encryption failed.", "error");
    }
  };

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
    } catch {
      showToast("Camera image encryption failed.", "error");
    }
  };

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
      } catch {
        showToast("Audio encryption failed.", "error");
      }
    };
    reader.readAsDataURL(audioBlob);
  };

  const handleTyping = (): void => {
    if (!activeChat || !isWebRTCConnected) return;
    const payload = JSON.stringify({ type: "TYPING" });
    const encryptedTyping = encrypt(activeChat, payload);
    if (encryptedTyping) sendDataViaWebRTC(activeChat, encryptedTyping);
  };

  const requestPeerWallet = (): void => {
    if (!activeChat || !hasSecret(activeChat) || !isWebRTCConnected) return;
    const requestPayload = JSON.stringify({ type: "WALLET_REQUEST" });
    const encryptedPayload = encrypt(activeChat, requestPayload);
    if (encryptedPayload) sendDataViaWebRTC(activeChat, encryptedPayload);
  };

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
      const chainIdHex = "0x539"; // Ganache
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

      const successPayload = JSON.stringify({
        type: "TX_SUCCESS",
        hash: txHash,
      });
      const encryptedSuccess = encrypt(activeChat!, successPayload);
      if (encryptedSuccess) sendDataViaWebRTC(activeChat!, encryptedSuccess);

      await db.messages.add({
        ownerAddress: address!.toLowerCase(),
        chatId: activeChat!.toLowerCase(),
        text: encryptLocalDB(`[SENT] ${amount} ETH\nTx Hash: ${txHash}`),
        isMine: true,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error("Direct MetaMask Transfer Error:", error);
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
