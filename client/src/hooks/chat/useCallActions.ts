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
  const initiateCall = (): void => {
    if (!activeChat || !isWebRTCConnected) return;

    console.log(`[Call Action] Initiating call to peer: ${activeChat}`);
    const payload = JSON.stringify({ type: "CALL_OFFER" });
    const encryptedCall = encrypt(activeChat, payload);

    if (encryptedCall) {
      sendDataViaWebRTC(activeChat, encryptedCall);
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

    const payload = JSON.stringify({ type: "CALL_ACCEPTED" });
    const encryptedAccept = encrypt(activeChat, payload);

    if (encryptedAccept) {
      sendDataViaWebRTC(activeChat, encryptedAccept);
      setIsIncomingCall(false);
      setIsInCall(true);
      console.log("[Call Action] Call connected successfully.");
    }
  };

  const declineCall = (): void => {
    if (!activeChat || !isWebRTCConnected) return;

    console.log("[Call Action] Declining incoming call.");
    const payload = JSON.stringify({ type: "CALL_REJECTED" });
    const encryptedReject = encrypt(activeChat, payload);

    if (encryptedReject) {
      sendDataViaWebRTC(activeChat, encryptedReject);
      setIsIncomingCall(false);
    }
  };

  const endCall = (): void => {
    if (!activeChat) return;

    console.log("[Call Action] Terminating active call.");
    stopVoiceCall(activeChat);

    const payload = JSON.stringify({ type: "CALL_ENDED" });
    const encrypted = encrypt(activeChat, payload);

    if (encrypted && isWebRTCConnected) {
      sendDataViaWebRTC(activeChat, encrypted);
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
