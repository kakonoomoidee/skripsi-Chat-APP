import { useRef, useCallback } from "react";

const P2P_AUDIO_ELEMENT_ID = "p2p-audio-stream";

const getAudioElement = (): HTMLAudioElement | null =>
  document.getElementById(P2P_AUDIO_ELEMENT_ID) as HTMLAudioElement | null;

/**
 * Hook to manage WebRTC media streams and audio tracks.
 *
 * @param {React.MutableRefObject<{ [address: string]: RTCPeerConnection }>} peerConnections - Reference to active peer connections.
 * @returns {Object} Media control functions and stream reference.
 */
export const useWebRTCMedia = (
  peerConnections: React.MutableRefObject<{
    [address: string]: RTCPeerConnection;
  }>,
) => {
  const localStreamRef = useRef<MediaStream | null>(null);

  const attachOutgoingAudioTrack = async (
    targetPeer: string,
    stream: MediaStream,
  ): Promise<void> => {
    const pc = peerConnections.current[targetPeer.toLowerCase()];
    if (!pc) {
      return;
    }

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      return;
    }

    const existingSender = pc
      .getSenders()
      .find(
        (sender) => sender.track === null || sender.track?.kind === "audio",
      );

    if (existingSender) {
      await existingSender.replaceTrack(audioTrack);
      return;
    }

    pc.addTrack(audioTrack, stream);
  };

  /**
   * Requests microphone access and attaches the active audio track to the peer connection.
   * Handles both replacing existing null tracks and adding new tracks dynamically.
   *
   * @param {string} targetPeer - The wallet address of the peer.
   * @returns {Promise<boolean>} True if the stream was successfully attached.
   */
  const startVoiceCall = useCallback(
    async (targetPeer: string): Promise<boolean> => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        localStreamRef.current = stream;

        await attachOutgoingAudioTrack(targetPeer, stream);

        const audioEl = getAudioElement();

        if (audioEl) {
          audioEl.muted = false;
          audioEl.play().catch(() => {});
        }

        return true;
      } catch {
        return false;
      }
    },
    [peerConnections],
  );

  /**
   * Terminates the active audio stream and sets the transceiver track back to null.
   *
   * @param {string} targetPeer - The wallet address of the peer.
   * @returns {void}
   */
  const stopVoiceCall = useCallback(
    (targetPeer: string): void => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }

      const pc = peerConnections.current[targetPeer.toLowerCase()];
      if (pc) {
        const audioSender = pc
          .getSenders()
          .find((s) => s.track?.kind === "audio");
        if (audioSender) {
          audioSender.replaceTrack(null);
        }
      }

      const audioEl = getAudioElement();
      if (audioEl) {
        audioEl.pause();
        audioEl.srcObject = null;
      }
    },
    [peerConnections],
  );

  /**
   * Toggles the enabled state of the local audio track.
   *
   * @returns {boolean} True if the microphone is muted, false otherwise.
   */
  const toggleMicMute = useCallback((): boolean => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        return !track.enabled;
      }
    }
    return false;
  }, []);

  return { startVoiceCall, stopVoiceCall, toggleMicMute, localStreamRef };
};
