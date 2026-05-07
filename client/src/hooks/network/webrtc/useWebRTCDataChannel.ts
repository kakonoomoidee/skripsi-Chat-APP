import { useRef, useCallback } from "react";
import ms from "ms";
import { db } from "@/utils/storage/db";
import {
  CHAT_PROTOCOL_TYPES,
  parseChatProtocolPayload,
  type ChatProtocolPayload,
} from "@/utils/chat/chatProtocol";

const MARK_AS_READ_SIGNAL_TYPE = "MARK_AS_READ";
const MESSAGE_DELIVERED_SIGNAL_TYPE = "MSG_DELIVERED";
const TYPING_INDICATOR_RESET_MS = ms("2500ms");

type DataChannelMessagePayload =
  | { type: typeof CHAT_PROTOCOL_TYPES.typing }
  | { type: "CALL_OFFER" }
  | { type: "CALL_ACCEPTED" }
  | { type: "CALL_REJECTED" }
  | { type: "CALL_ENDED" }
  | { type: typeof MARK_AS_READ_SIGNAL_TYPE }
  | { type: typeof MESSAGE_DELIVERED_SIGNAL_TYPE; timestamp: number };

const parseDataChannelPayload = (
  rawPayload: string,
): DataChannelMessagePayload | null => {
  try {
    const parsed = JSON.parse(rawPayload) as {
      type?: unknown;
      timestamp?: unknown;
    };

    if (parsed.type === CHAT_PROTOCOL_TYPES.typing) {
      return { type: CHAT_PROTOCOL_TYPES.typing };
    }

    if (parsed.type === "CALL_OFFER") {
      return { type: "CALL_OFFER" };
    }

    if (parsed.type === "CALL_ACCEPTED") {
      return { type: "CALL_ACCEPTED" };
    }

    if (parsed.type === "CALL_REJECTED") {
      return { type: "CALL_REJECTED" };
    }

    if (parsed.type === "CALL_ENDED") {
      return { type: "CALL_ENDED" };
    }

    if (parsed.type === MARK_AS_READ_SIGNAL_TYPE) {
      return { type: MARK_AS_READ_SIGNAL_TYPE };
    }

    if (
      parsed.type === MESSAGE_DELIVERED_SIGNAL_TYPE &&
      typeof parsed.timestamp === "number"
    ) {
      return {
        type: MESSAGE_DELIVERED_SIGNAL_TYPE,
        timestamp: parsed.timestamp,
      };
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Interface defining the dependencies required by the useWebRTCDataChannel hook.
 */
interface UseWebRTCDataChannelProps {
  myAddress: string | null;
  decrypt: (peerAddress: string, cipherText: string) => string;
  encryptLocalDB: (plainText: string) => string;
  encrypt: (peerAddress: string, plainText: string) => string | null;
  setIsPeerTyping?: (val: boolean) => void;
  onProtocolMessage?: (
    peerAddress: string,
    payload: ChatProtocolPayload,
  ) => Promise<void> | void;
  onCallOffer?: () => void;
  onCallAccepted?: () => void;
  onCallRejected?: () => void;
  onCallEnded?: () => void;
  startVoiceCall: (peerAddress: string) => Promise<boolean>;
  stopVoiceCall: (peerAddress: string) => void;
}

/**
 * Hook to manage WebRTC Data Channels for messaging and signaling.
 *
 * @param {UseWebRTCDataChannelProps} props - Dependencies and callbacks from the main WebRTC hook.
 * @returns {Object} DataChannel instance and message handling methods.
 */
export const useWebRTCDataChannel = ({
  myAddress,
  decrypt,
  encryptLocalDB,
  encrypt,
  setIsPeerTyping,
  onProtocolMessage,
  onCallOffer,
  onCallAccepted,
  onCallRejected,
  onCallEnded,
  startVoiceCall,
  stopVoiceCall,
}: UseWebRTCDataChannelProps) => {
  const dataChannels = useRef<{ [address: string]: RTCDataChannel }>({});
  const typingTimeoutRef = useRef<number | null>(null);

  const clearTypingTimeout = (): void => {
    if (typingTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = null;
  };

  /**
   * Transmits encrypted data through the established Data Channel for a given peer.
   *
   * @param {string} targetPeer - The destination peer address.
   * @param {string} encryptedData - The payload to transmit.
   * @returns {void}
   */
  const sendDataViaWebRTC = useCallback(
    (targetPeer: string, encryptedData: string): void => {
      const dc = dataChannels.current[targetPeer.toLowerCase()];
      if (dc?.readyState === "open") dc.send(encryptedData);
    },
    [],
  );

  /**
   * Emits an encrypted MARK_AS_READ signal to a peer over the DataChannel,
   * instructing them to update all their sent messages to 'read' status.
   *
   * @param {string} peerAddress - The peer address to notify.
   * @returns {void}
   */
  const sendMarkAsRead = useCallback(
    (peerAddress: string): void => {
      if (!peerAddress) return;
      const signal = JSON.stringify({ type: MARK_AS_READ_SIGNAL_TYPE });
      const encrypted = encrypt(peerAddress, signal);
      if (encrypted) {
        sendDataViaWebRTC(peerAddress, encrypted);
      }
    },
    [encrypt, sendDataViaWebRTC],
  );

  /**
   * Handles incoming encrypted payloads, short-circuits protocol/system signals,
   * and persists only renderable chat content.
   *
   * @param {string} peerAddress - The sender's address.
   * @param {string} encryptedData - The encrypted payload string.
   * @returns {Promise<void>}
   */
  const handleIncomingMessage = useCallback(
    async (peerAddress: string, encryptedData: string): Promise<void> => {
      try {
        const decryptedContent = decrypt(peerAddress, encryptedData);
        const protocolPayload = parseChatProtocolPayload(decryptedContent);

        if (protocolPayload) {
          if (
            protocolPayload.type === CHAT_PROTOCOL_TYPES.typing &&
            setIsPeerTyping
          ) {
            setIsPeerTyping(true);
            clearTypingTimeout();
            typingTimeoutRef.current = window.setTimeout(
              () => setIsPeerTyping(false),
              TYPING_INDICATOR_RESET_MS,
            );
            return;
          }

          if (
            protocolPayload.type === CHAT_PROTOCOL_TYPES.walletRequest ||
            protocolPayload.type === CHAT_PROTOCOL_TYPES.walletResponse ||
            protocolPayload.type === CHAT_PROTOCOL_TYPES.profileSync
          ) {
            if (onProtocolMessage) {
              await onProtocolMessage(peerAddress, protocolPayload);
            }
            return;
          }
        }

        const parsedPayload = parseDataChannelPayload(decryptedContent);

        if (parsedPayload?.type === "CALL_OFFER" && onCallOffer) {
          onCallOffer();
          return;
        }

        if (parsedPayload?.type === "CALL_ACCEPTED") {
          startVoiceCall(peerAddress).then((success: boolean) => {
            if (success && onCallAccepted) onCallAccepted();
          });
          return;
        }

        if (parsedPayload?.type === "CALL_REJECTED" && onCallRejected) {
          onCallRejected();
          return;
        }

        if (parsedPayload?.type === "CALL_ENDED") {
          stopVoiceCall(peerAddress);
          if (onCallEnded) onCallEnded();
          return;
        }

        if (
          parsedPayload?.type === MESSAGE_DELIVERED_SIGNAL_TYPE &&
          myAddress
        ) {
          await db.messages
            .where("[ownerAddress+chatId]")
            .equals([myAddress.toLowerCase(), peerAddress.toLowerCase()])
            .filter(
              (msg) =>
                msg.isMine &&
                msg.status === "pending" &&
                msg.timestamp <= parsedPayload.timestamp,
            )
            .modify({ status: "delivered" });
          return;
        }

        if (parsedPayload?.type === MARK_AS_READ_SIGNAL_TYPE && myAddress) {
          await db.messages
            .where("[ownerAddress+chatId]")
            .equals([myAddress.toLowerCase(), peerAddress.toLowerCase()])
            .filter((msg) => msg.isMine && msg.status !== "read")
            .modify({ status: "read" });
          return;
        }

        if (!myAddress) return;
        const isReceivedImage = decryptedContent.startsWith("data:image");
        const messageTimestamp = Date.now();

        await db.messages.add({
          ownerAddress: myAddress.toLowerCase(),
          chatId: peerAddress,
          text: encryptLocalDB(decryptedContent),
          isMine: false,
          timestamp: messageTimestamp,
          isImage: isReceivedImage,
        });

        const deliveredSignal = JSON.stringify({
          type: MESSAGE_DELIVERED_SIGNAL_TYPE,
          timestamp: messageTimestamp,
        });
        const encryptedAck = encrypt(peerAddress, deliveredSignal);
        if (encryptedAck) {
          sendDataViaWebRTC(peerAddress, encryptedAck);
        }
      } catch {}
    },
    [
      decrypt,
      setIsPeerTyping,
      onProtocolMessage,
      onCallOffer,
      onCallAccepted,
      onCallRejected,
      onCallEnded,
      myAddress,
      encryptLocalDB,
      startVoiceCall,
      stopVoiceCall,
      encrypt,
      sendDataViaWebRTC,
    ],
  );

  return {
    dataChannels,
    handleIncomingMessage,
    sendDataViaWebRTC,
    sendMarkAsRead,
  };
};
