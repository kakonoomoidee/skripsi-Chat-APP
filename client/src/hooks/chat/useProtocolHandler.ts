import { useEffect } from "react";
import { db } from "@/utils/storage/db";
import { type Message } from "@/utils/storage/db";
import { getStoredWalletAddresses } from "@/services/walletBalanceService";
import {
  CHAT_PROTOCOL_TYPES,
  parseChatProtocolPayload,
} from "@/utils/chat/chatProtocol";
import { useChatStore } from "@/store/useChatStore";
import { useWalletStore } from "@/store";

const removeProtocolMessage = async (messageId?: number): Promise<void> => {
  if (!messageId) {
    return;
  }

  await db.messages.delete(messageId);
};

const resolveTransactionAddress = (
  fallbackAddress: string | null,
): string | null => {
  const { internalAddress, externalAddress } = getStoredWalletAddresses();
  return internalAddress || externalAddress || fallbackAddress;
};

const sendWalletResponse = (
  activeChat: string,
  txAddress: string,
  encrypt: (peer: string, data: string) => string | null,
  sendDataViaWebRTC: (peer: string, data: string) => void,
): void => {
  const responsePayload = JSON.stringify({
    type: CHAT_PROTOCOL_TYPES.walletResponse,
    address: txAddress,
  });
  const encryptedResponse = encrypt(activeChat, responsePayload);
  if (encryptedResponse) {
    sendDataViaWebRTC(activeChat, encryptedResponse);
  }
};

/**
 * Interface defining the dependencies for the useProtocolHandler hook.
 */
export interface UseProtocolHandlerProps {
  messages: Message[];
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
      const { peerWalletAddress, setPeerWalletAddress } =
        useWalletStore.getState();
      const parsedPayload = parseChatProtocolPayload(latestMessage.text);
      if (!parsedPayload) return;

      if (parsedPayload.type === CHAT_PROTOCOL_TYPES.walletResponse) {
        if (peerWalletAddress !== parsedPayload.address) {
          setPeerWalletAddress(parsedPayload.address);
        }
        await removeProtocolMessage(latestMessage.id);
        return;
      }

      if (parsedPayload.type === CHAT_PROTOCOL_TYPES.walletRequest) {
        const txAddress = resolveTransactionAddress(address);

        if (txAddress && activeChat) {
          sendWalletResponse(activeChat, txAddress, encrypt, sendDataViaWebRTC);
        }

        await removeProtocolMessage(latestMessage.id);
        return;
      }

      if (
        parsedPayload.type === CHAT_PROTOCOL_TYPES.profileSync &&
        activeChat
      ) {
        const existing = await db.contacts.get(activeChat.toLowerCase());
        if (existing) {
          await db.contacts.put({ ...existing, avatar: parsedPayload.avatar });
        }
        await removeProtocolMessage(latestMessage.id);
      }
    };
    handleProtocolMessages();
  }, [messages, activeChat, address, encrypt, sendDataViaWebRTC]);
};
