/**
 * Interface defining the dependencies required by the useCallActions hook.
 */
export interface UseCallActionsParams {
  activeChat: string | null;
  isWebRTCConnected: boolean;
  encrypt: (chatId: string, payload: string) => string | null;
  sendDataViaWebRTC: (chatId: string, payload: string) => void;
  startVoiceCall: (chatId: string) => Promise<boolean>;
  stopVoiceCall: (chatId: string) => void;
  toggleMicMute: () => boolean;
  setIsIncomingCall: (isIncoming: boolean) => void;
  setIsInCall: (inCall: boolean) => void;
  setIsMuted: (isMuted: boolean) => void;
  showToast: (message: string, type: "success" | "error") => void;
}

/**
 * Interface defining the return methods for call management.
 */
export interface UseCallActionsReturn {
  initiateCall: () => void;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
}

const CALL_SIGNAL_TYPES = {
  offer: "CALL_OFFER",
  accepted: "CALL_ACCEPTED",
  rejected: "CALL_REJECTED",
  ended: "CALL_ENDED",
} as const;

/**
 * Custom hook to manage WebRTC voice call signaling and actions.
 * Encapsulates the logic for offering, answering, rejecting, and ending calls.
 * @param {UseCallActionsParams} params - Dependencies injected from the ChatContext.
 * @returns {UseCallActionsReturn} Object containing call action methods.
 */
export const useCallActions = ({
  activeChat,
  isWebRTCConnected,
  encrypt,
  sendDataViaWebRTC,
  startVoiceCall,
  stopVoiceCall,
  toggleMicMute,
  setIsIncomingCall,
  setIsInCall,
  setIsMuted,
  showToast,
}: UseCallActionsParams): UseCallActionsReturn => {
  const sendCallSignal = (
    signalType: (typeof CALL_SIGNAL_TYPES)[keyof typeof CALL_SIGNAL_TYPES],
  ): boolean => {
    if (!activeChat) {
      return false;
    }

    const payload = JSON.stringify({ type: signalType });
    const encryptedPayload = encrypt(activeChat, payload);

    if (!encryptedPayload) {
      return false;
    }

    sendDataViaWebRTC(activeChat, encryptedPayload);
    return true;
  };

  const initiateCall = (): void => {
    if (!activeChat || !isWebRTCConnected) return;

    console.log(`[Call Action] Initiating call to peer: ${activeChat}`);
    const wasSent = sendCallSignal(CALL_SIGNAL_TYPES.offer);

    if (wasSent) {
      showToast("Calling...", "success");
    }
  };

  const acceptCall = async (): Promise<void> => {
    if (!activeChat || !isWebRTCConnected) return;

    console.log("[Call Action] Accepting incoming call...");
    const micStarted = await startVoiceCall(activeChat);

    if (!micStarted) {
      console.error("[Call Error] Failed to access microphone.");
      showToast("Microphone access needed.", "error");
      return;
    }

    const wasSent = sendCallSignal(CALL_SIGNAL_TYPES.accepted);

    if (wasSent) {
      setIsIncomingCall(false);
      setIsInCall(true);
      console.log("[Call Action] Call connected successfully.");
    }
  };

  const declineCall = (): void => {
    if (!activeChat || !isWebRTCConnected) return;

    console.log("[Call Action] Declining incoming call.");
    const wasSent = sendCallSignal(CALL_SIGNAL_TYPES.rejected);

    if (wasSent) {
      setIsIncomingCall(false);
    }
  };

  const endCall = (): void => {
    if (!activeChat) return;

    console.log("[Call Action] Terminating active call.");
    stopVoiceCall(activeChat);

    if (isWebRTCConnected) {
      sendCallSignal(CALL_SIGNAL_TYPES.ended);
    }

    setIsInCall(false);
    setIsIncomingCall(false);
    setIsMuted(false);
  };

  const toggleMute = (): void => {
    const mutedStatus = toggleMicMute();
    setIsMuted(mutedStatus);
    console.log(`[Call Action] Microphone muted: ${mutedStatus}`);
  };

  return {
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
  };
};
