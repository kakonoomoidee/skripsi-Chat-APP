import { useEffect, useRef, useState, useCallback } from "react";
import { useWebRTCMedia } from "./webrtc/useWebRTCMedia";
import { useWebRTCDataChannel } from "./webrtc/useWebRTCDataChannel";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

/**
 * Main facade hook orchestrating WebRTC connections, signaling, and media streams.
 *
 * @param {any} props - Dependencies injected from the ChatContext.
 * @returns {Object} WebRTC state and control methods.
 */
export const useWebRTC = (props: any) => {
  const {
    socket,
    myAddress,
    activeChat,
    hasSecret,
    computeSecret,
    generateHandshakeKeys,
    onPeerDisconnected,
    encrypt,
    incrementUnread,
  } = props;

  const peerConnections = useRef<{ [address: string]: RTCPeerConnection }>({});
  const iceQueues = useRef<{ [address: string]: RTCIceCandidateInit[] }>({});
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const isWebRTCConnected = activeChat
    ? connectedPeers.includes(activeChat.toLowerCase())
    : false;

  const { startVoiceCall, stopVoiceCall, toggleMicMute } =
    useWebRTCMedia(peerConnections);

  const { dataChannels, handleIncomingMessage, sendDataViaWebRTC, sendMarkAsRead } =
    useWebRTCDataChannel({
      ...props,
      encrypt,
      incrementUnread,
      startVoiceCall,
      stopVoiceCall,
    });

  /**
   * Attaches the remote media stream to the hidden audio element.
   *
   * @param {RTCPeerConnection} pc - The active peer connection.
   * @returns {void}
   */
  const setupAudioTrack = (pc: RTCPeerConnection) => {
    pc.ontrack = (event) => {
      let audioEl = document.getElementById(
        "p2p-audio-stream",
      ) as HTMLAudioElement;
      if (!audioEl) {
        audioEl = document.createElement("audio");
        audioEl.id = "p2p-audio-stream";
        audioEl.autoplay = true;
        document.body.appendChild(audioEl);
      }
      const stream =
        event.streams && event.streams.length > 0
          ? event.streams[0]
          : new MediaStream([event.track]);
      if (audioEl.srcObject !== stream) {
        audioEl.srcObject = stream;
        audioEl.play().catch(() => {});
      }
    };
  };

  /**
   * Cleans up all resources associated with a disconnected peer.
   *
   * @param {string} peerAddress - The address of the peer to disconnect.
   * @returns {void}
   */
  const forceDisconnectPeer = useCallback(
    (peerAddress: string): void => {
      const addr = peerAddress.toLowerCase();
      if (peerConnections.current[addr]) {
        peerConnections.current[addr].close();
        delete peerConnections.current[addr];
      }
      if (dataChannels.current[addr]) {
        dataChannels.current[addr].close();
        delete dataChannels.current[addr];
      }
      setConnectedPeers((prev) => prev.filter((p) => p !== addr));

      if (onPeerDisconnected) onPeerDisconnected(addr);
    },
    [onPeerDisconnected],
  );

  /**
   * Initiates the P2P connection sequence as the offerer.
   *
   * @param {string} targetPeer - The address of the target peer.
   * @returns {Promise<void>}
   */
  const initiateWebRTCConnection = useCallback(
    async (targetPeer: string) => {
      if (!socket || !targetPeer || !myAddress) return;
      const peerAddress = targetPeer.toLowerCase();

      if (peerConnections.current[peerAddress])
        peerConnections.current[peerAddress].close();

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections.current[peerAddress] = pc;
      iceQueues.current[peerAddress] = [];

      pc.addTransceiver("audio", { direction: "sendrecv" });
      setupAudioTrack(pc);

      const dc = pc.createDataChannel("secure_p2p_channel", { ordered: true });
      dataChannels.current[peerAddress] = dc;

      dc.onopen = () =>
        setConnectedPeers((prev) => [...new Set([...prev, peerAddress])]);
      dc.onclose = () => forceDisconnectPeer(peerAddress);
      dc.onmessage = (msgEvent) =>
        handleIncomingMessage(peerAddress, msgEvent.data);

      pc.onicecandidate = (event) => {
        if (event.candidate)
          socket.emit("webrtc_signal", {
            to: peerAddress,
            signal: { type: "ice-candidate", candidate: event.candidate },
          });
      };

      pc.oniceconnectionstatechange = () => {
        if (
          ["disconnected", "failed", "closed"].includes(pc.iceConnectionState)
        ) {
          forceDisconnectPeer(peerAddress);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("webrtc_signal", {
        to: peerAddress,
        signal: {
          type: "offer",
          offer,
          ephemeralPublicKey: !hasSecret(peerAddress)
            ? generateHandshakeKeys(peerAddress)
            : undefined,
        },
      });
    },
    [
      socket,
      myAddress,
      hasSecret,
      generateHandshakeKeys,
      handleIncomingMessage,
      dataChannels,
      forceDisconnectPeer,
    ],
  );

  useEffect(() => {
    if (!socket || !myAddress) return;

    const handleWebRTCSignal = async (data: { from: string; signal: any }) => {
      const peerAddress = data.from.toLowerCase();
      const { signal } = data;

      if (signal.type === "offer") {
        if (peerConnections.current[peerAddress])
          peerConnections.current[peerAddress].close();

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnections.current[peerAddress] = pc;
        iceQueues.current[peerAddress] = [];

        setupAudioTrack(pc);

        pc.ondatachannel = (event) => {
          const dc = event.channel;
          dataChannels.current[peerAddress] = dc;
          dc.onopen = () =>
            setConnectedPeers((prev) => [...new Set([...prev, peerAddress])]);
          dc.onclose = () => forceDisconnectPeer(peerAddress);
          dc.onmessage = (msgEvent) =>
            handleIncomingMessage(peerAddress, msgEvent.data);
        };

        pc.onicecandidate = (event) => {
          if (event.candidate)
            socket.emit("webrtc_signal", {
              to: peerAddress,
              signal: { type: "ice-candidate", candidate: event.candidate },
            });
        };

        pc.oniceconnectionstatechange = () => {
          if (
            ["disconnected", "failed", "closed"].includes(pc.iceConnectionState)
          ) {
            forceDisconnectPeer(peerAddress);
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
        pc.getTransceivers().forEach((t) => (t.direction = "sendrecv"));

        if (
          !hasSecret(peerAddress) &&
          computeSecret &&
          signal.ephemeralPublicKey
        ) {
          computeSecret(peerAddress, signal.ephemeralPublicKey);
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("webrtc_signal", {
          to: peerAddress,
          signal: {
            type: "answer",
            answer,
            ephemeralPublicKey: signal.ephemeralPublicKey
              ? generateHandshakeKeys(peerAddress)
              : undefined,
          },
        });
      } else if (signal.type === "answer") {
        const pc = peerConnections.current[peerAddress];
        if (pc)
          await pc.setRemoteDescription(
            new RTCSessionDescription(signal.answer),
          );
      } else if (signal.type === "ice-candidate" && signal.candidate) {
        const pc = peerConnections.current[peerAddress];
        if (pc && pc.remoteDescription)
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    };

    socket.on("webrtc_signal", handleWebRTCSignal);
    return () => {
      socket.off("webrtc_signal", handleWebRTCSignal);
    };
  }, [
    socket,
    myAddress,
    hasSecret,
    computeSecret,
    generateHandshakeKeys,
    handleIncomingMessage,
    dataChannels,
    forceDisconnectPeer,
  ]);

  return {
    isWebRTCConnected,
    sendDataViaWebRTC,
    sendMarkAsRead,
    initiateWebRTCConnection,
    connectedPeers,
    startVoiceCall,
    stopVoiceCall,
    toggleMicMute,
    forceDisconnectPeer,
  };
};
