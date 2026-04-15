import { useRef, useCallback } from "react";
import { db } from "@/utils/db";

/**
 * Interface defining the dependencies required by the useWebRTCDataChannel hook.
 */
interface UseWebRTCDataChannelProps {
  myAddress: string | null;
  activeChat: string | null;
  decrypt: (peerAddress: string, cipherText: string) => string;
  encryptLocalDB: (plainText: string) => string;
  encrypt: (peerAddress: string, plainText: string) => string | null;
  setIsPeerTyping: ((val: boolean) => void) | undefined;
  onCallOffer: (() => void) | undefined;
  onCallAccepted: (() => void) | undefined;
  onCallRejected: (() => void) | undefined;
  onCallEnded: (() => void) | undefined;
  startVoiceCall: (peerAddress: string) => Promise<boolean>;
  stopVoiceCall: (peerAddress: string) => void;
  incrementUnread: (peerAddress: string) => void;
}

/**
 * Hook to manage WebRTC Data Channels for messaging and signaling.
 *
 * @param {UseWebRTCDataChannelProps} props - Dependencies and callbacks from the main WebRTC hook.
 * @returns {Object} DataChannel instance and message handling methods.
 */
export const useWebRTCDataChannel = ({
  myAddress,
  activeChat,
  decrypt,
  encryptLocalDB,
  encrypt,
  setIsPeerTyping,
  onCallOffer,
  onCallAccepted,
  onCallRejected,
  onCallEnded,
  startVoiceCall,
  stopVoiceCall,
  incrementUnread,
}: UseWebRTCDataChannelProps) => {
  const dataChannels = useRef<{ [address: string]: RTCDataChannel }>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      const signal = JSON.stringify({ type: "MARK_AS_READ" });
      const encrypted = encrypt(peerAddress, signal);
      if (encrypted) {
        sendDataViaWebRTC(peerAddress, encrypted);
      }
    },
    [encrypt, sendDataViaWebRTC],
  );

  /**
   * Handles incoming encrypted payloads, parses protocol signals, and stores messages.
   * Upon persisting a new message, it automatically emits an MSG_DELIVERED ack to the sender.
   *
   * @param {string} peerAddress - The sender's address.
   * @param {string} encryptedData - The encrypted payload string.
   * @returns {Promise<void>}
   */
  const handleIncomingMessage = useCallback(
    async (peerAddress: string, encryptedData: string): Promise<void> => {
      try {
        const decryptedContent = decrypt(peerAddress, encryptedData);

        try {
          const parsed = JSON.parse(decryptedContent);

          if (parsed.type === "TYPING" && setIsPeerTyping) {
            setIsPeerTyping(true);
            if (typingTimeoutRef.current)
              clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(
              () => setIsPeerTyping(false),
              2500,
            );
            return;
          }

          if (parsed.type === "CALL_OFFER" && onCallOffer) {
            onCallOffer();
            return;
          }

          if (parsed.type === "CALL_ACCEPTED") {
            startVoiceCall(peerAddress).then((success: boolean) => {
              if (success && onCallAccepted) onCallAccepted();
            });
            return;
          }

          if (parsed.type === "CALL_REJECTED" && onCallRejected) {
            onCallRejected();
            return;
          }

          if (parsed.type === "CALL_ENDED") {
            stopVoiceCall(peerAddress);
            if (onCallEnded) onCallEnded();
            return;
          }

          /**
           * Handles an MSG_DELIVERED ack from the peer.
           * Upgrades all 'pending' outbound messages up to the acknowledged timestamp
           * to 'delivered' status in the local IndexedDB.
           */
          if (parsed.type === "MSG_DELIVERED" && myAddress) {
            await db.messages
              .where("[ownerAddress+chatId]")
              .equals([myAddress.toLowerCase(), peerAddress.toLowerCase()])
              .filter(
                (msg) =>
                  msg.isMine &&
                  msg.status === "pending" &&
                  msg.timestamp <= parsed.timestamp,
              )
              .modify({ status: "delivered" });
            return;
          }

          /**
           * Handles a MARK_AS_READ signal from the peer indicating they have opened the chat.
           * Upgrades all outbound messages from 'delivered' to 'read' in the local IndexedDB.
           */
          if (parsed.type === "MARK_AS_READ" && myAddress) {
            await db.messages
              .where("[ownerAddress+chatId]")
              .equals([myAddress.toLowerCase(), peerAddress.toLowerCase()])
              .filter((msg) => msg.isMine && msg.status !== "read")
              .modify({ status: "read" });
            return;
          }
        } catch {}

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

        if (activeChat?.toLowerCase() !== peerAddress.toLowerCase()) {
          incrementUnread(peerAddress);
        }

        const deliveredSignal = JSON.stringify({
          type: "MSG_DELIVERED",
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
      onCallOffer,
      onCallAccepted,
      onCallRejected,
      onCallEnded,
      myAddress,
      encryptLocalDB,
      activeChat,
      startVoiceCall,
      stopVoiceCall,
      incrementUnread,
      encrypt,
      sendDataViaWebRTC,
    ],
  );

  return { dataChannels, handleIncomingMessage, sendDataViaWebRTC, sendMarkAsRead };
};
