import { useRef, useCallback } from "react";
import { db } from "@/utils/db";
import { useUIStore } from "@/store";

/**
 * Hook to manage WebRTC Data Channels for messaging and signaling.
 * * @param {any} props - Dependencies and callbacks from the main WebRTC hook.
 * @returns {Object} DataChannel instance and message handling methods.
 */
export const useWebRTCDataChannel = ({
  myAddress,
  activeChat,
  decrypt,
  encryptLocalDB,
  setIsPeerTyping,
  onCallOffer,
  onCallAccepted,
  onCallRejected,
  onCallEnded,
  startVoiceCall,
  stopVoiceCall,
}: any) => {
  const dataChannels = useRef<{ [address: string]: RTCDataChannel }>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Handles incoming encrypted payloads, parses protocol signals, and stores messages.
   * * @param {string} peerAddress - The sender's address.
   * @param {string} encryptedData - The encrypted payload string.
   * @returns {Promise<void>}
   */
  const handleIncomingMessage = useCallback(
    async (peerAddress: string, encryptedData: string): Promise<void> => {
      try {
        const decryptedContent = decrypt(peerAddress, encryptedData);

        if (activeChat?.toLowerCase() !== peerAddress.toLowerCase()) {
          useUIStore.getState().setHasUnread(true);
        }

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
        } catch {}

        if (!myAddress) return;
        const isReceivedImage = decryptedContent.startsWith("data:image");

        await db.messages.add({
          ownerAddress: myAddress.toLowerCase(),
          chatId: peerAddress,
          text: encryptLocalDB(decryptedContent),
          isMine: false,
          timestamp: Date.now(),
          isImage: isReceivedImage,
        });
      } catch (error) {
        // Silent catch for parsing errors
      }
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
    ],
  );

  /**
   * Transmits encrypted data through the established Data Channel.
   * * @param {string} targetPeer - The destination peer address.
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

  return { dataChannels, handleIncomingMessage, sendDataViaWebRTC };
};
