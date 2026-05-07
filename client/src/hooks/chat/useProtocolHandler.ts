import { useEffect, useRef } from "react";
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
  const processedMessageIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const handleProtocolMessages = async (): Promise<void> => {
      if (!messages || messages.length === 0) return;

      const { peerWalletAddress, setPeerWalletAddress } =
        useWalletStore.getState();

      for (const message of messages) {
        if (!message.id || processedMessageIdsRef.current.has(message.id)) {
          continue;
        }

        if (!message.text) {
          processedMessageIdsRef.current.add(message.id);
          continue;
        }

        const parsedPayload = parseChatProtocolPayload(message.text);
        if (!parsedPayload) {
          processedMessageIdsRef.current.add(message.id);
          continue;
        }

        if (parsedPayload.type === CHAT_PROTOCOL_TYPES.walletResponse) {
          if (peerWalletAddress !== parsedPayload.address) {
            setPeerWalletAddress(parsedPayload.address);
          }
          processedMessageIdsRef.current.add(message.id);
          await removeProtocolMessage(message.id);
          continue;
        }

        if (parsedPayload.type === CHAT_PROTOCOL_TYPES.walletRequest) {
          const txAddress = resolveTransactionAddress(address);

          if (txAddress && activeChat) {
            sendWalletResponse(
              activeChat,
              txAddress,
              encrypt,
              sendDataViaWebRTC,
            );
          }

          processedMessageIdsRef.current.add(message.id);
          await removeProtocolMessage(message.id);
          continue;
        }

        if (
          parsedPayload.type === CHAT_PROTOCOL_TYPES.profileSync &&
          activeChat
        ) {
          const existing = await db.contacts.get(activeChat.toLowerCase());
          if (existing) {
            await db.contacts.put({
              ...existing,
              avatar: parsedPayload.avatar,
            });
          }
          processedMessageIdsRef.current.add(message.id);
          await removeProtocolMessage(message.id);
        }
      }
    };

    handleProtocolMessages();
  }, [messages, activeChat, address, encrypt, sendDataViaWebRTC]);
};
