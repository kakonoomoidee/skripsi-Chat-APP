import { useEffect } from "react";
import { db } from "@/utils/db";
import { useChatStore } from "@/store/useChatStore";
import { useWalletStore } from "@/store";

/**
 * Interface defining the dependencies for the useProtocolHandler hook.
 */
export interface UseProtocolHandlerProps {
  messages: any[];
  address: string | null;
  encrypt: (peer: string, data: string) => string | null;
  sendDataViaWebRTC: (peer: string, data: string) => void;
}

/**
 * Custom hook to intercept and handle system-level protocol messages.
 * Processes WALLET_REQUEST, WALLET_RESPONSE, and PROFILE_SYNC without exposing
 * them to the chat UI.
 *
 * @param {UseProtocolHandlerProps} props - Dependencies.
 */
export const useProtocolHandler = ({
  messages,
  address,
  encrypt,
  sendDataViaWebRTC,
}: UseProtocolHandlerProps) => {
  const { activeChat } = useChatStore();

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
  }, [messages, activeChat, address, encrypt, sendDataViaWebRTC]);
};
