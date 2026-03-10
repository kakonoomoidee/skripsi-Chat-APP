/**
 * Hook to manage WebRTC voice call actions.
 * @param {any} params - Dependencies required for call actions.
 * @returns {object} Call action methods.
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
}: any) => {
  const initiateCall = (): void => {
    if (!activeChat || !isWebRTCConnected) return;
    const payload = JSON.stringify({ type: "CALL_OFFER" });
    const encryptedCall = encrypt(activeChat, payload);
    if (encryptedCall) {
      sendDataViaWebRTC(activeChat, encryptedCall);
      showToast("Calling...", "success");
    }
  };

  const acceptCall = async (): Promise<void> => {
    if (!activeChat || !isWebRTCConnected) return;

    const micStarted = await startVoiceCall(activeChat);
    if (!micStarted) {
      showToast("Microphone access needed.", "error");
      return;
    }

    const payload = JSON.stringify({ type: "CALL_ACCEPTED" });
    const encryptedAccept = encrypt(activeChat, payload);
    if (encryptedAccept) {
      sendDataViaWebRTC(activeChat, encryptedAccept);
      setIsIncomingCall(false);
      setIsInCall(true);
    }
  };

  const declineCall = (): void => {
    if (!activeChat || !isWebRTCConnected) return;
    const payload = JSON.stringify({ type: "CALL_REJECTED" });
    const encryptedReject = encrypt(activeChat, payload);
    if (encryptedReject) {
      sendDataViaWebRTC(activeChat, encryptedReject);
      setIsIncomingCall(false);
    }
  };

  const endCall = (): void => {
    if (!activeChat) return;

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
  };

  return { initiateCall, acceptCall, declineCall, endCall, toggleMute };
};
