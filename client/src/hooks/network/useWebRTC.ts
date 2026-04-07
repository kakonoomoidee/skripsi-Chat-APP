import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import { db } from "@/utils/db";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

/**
 * Interface defining the dependencies required by the useWebRTC hook.
 */
export interface UseWebRTCParams {
  socket: Socket | null;
  myAddress: string | null;
  activeChat: string | null;
  decrypt: (peerAddress: string, encryptedMessage: string) => string;
  encryptLocalDB: (plainText: string) => string;
  generateHandshakeKeys: (peerAddress: string) => string;
  computeSecret: (peerAddress: string, peerPublicKey: string) => void;
  hasSecret: (peerAddress: string) => boolean;
  setIsPeerTyping?: (isTyping: boolean) => void;
  onCallOffer?: () => void;
  onCallAccepted?: () => void;
  onCallRejected?: () => void;
  onCallEnded?: () => void;
  onPeerDisconnected?: (peerAddress: string) => void;
}

/**
 * Interface defining the return methods and states for WebRTC management.
 */
export interface UseWebRTCReturn {
  isWebRTCConnected: boolean;
  sendDataViaWebRTC: (targetPeer: string, encryptedData: string) => void;
  initiateWebRTCConnection: (targetPeer: string) => Promise<void>;
  connectedPeers: string[];
  startVoiceCall: (targetPeer: string) => Promise<boolean>;
  stopVoiceCall: (targetPeer: string) => void;
  toggleMicMute: () => boolean;
  forceDisconnectPeer: (peerAddress: string) => void;
}

/**
 * Custom hook to orchestrate WebRTC Peer-to-Peer connections.
 * Handles signaling, Data Channels, and Media Streams.
 * @param {UseWebRTCParams} params - Dependencies and event callbacks.
 * @returns {UseWebRTCReturn} WebRTC control methods and connection states.
 */
export const useWebRTC = ({
  socket,
  myAddress,
  activeChat,
  decrypt,
  encryptLocalDB,
  generateHandshakeKeys,
  computeSecret,
  hasSecret,
  setIsPeerTyping,
  onCallOffer,
  onCallAccepted,
  onCallRejected,
  onCallEnded,
  onPeerDisconnected,
}: UseWebRTCParams): UseWebRTCReturn => {
  const peerConnections = useRef<{ [address: string]: RTCPeerConnection }>({});
  const dataChannels = useRef<{ [address: string]: RTCDataChannel }>({});
  const iceQueues = useRef<{ [address: string]: RTCIceCandidateInit[] }>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);

  const isWebRTCConnected = activeChat
    ? connectedPeers.includes(activeChat.toLowerCase())
    : false;

  useEffect(() => {
    const handleUnload = () => {
      console.log(
        "[WebRTC] Window unloading. Terminating all active P2P connections.",
      );
      Object.values(dataChannels.current).forEach((dc) => dc.close());
      Object.values(peerConnections.current).forEach((pc) => pc.close());
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      handleUnload();
    };
  }, []);

  /**
   * Forcibly closes the connection and data channels for a specific peer.
   * @param {string} peerAddress - The address of the peer to disconnect.
   * @returns {void}
   */
  const forceDisconnectPeer = useCallback((peerAddress: string): void => {
    const addr = peerAddress.toLowerCase();
    console.log(`[WebRTC] Forcing disconnection for peer: ${addr}`);

    if (peerConnections.current[addr]) {
      peerConnections.current[addr].oniceconnectionstatechange = null;
      peerConnections.current[addr].close();
      delete peerConnections.current[addr];
    }
    if (dataChannels.current[addr]) {
      dataChannels.current[addr].onclose = null;
      dataChannels.current[addr].close();
      delete dataChannels.current[addr];
    }
    setConnectedPeers((prev) => prev.filter((p) => p !== addr));
  }, []);

  /**
   * Requests media access and attaches the local audio stream to the peer connection.
   * @param {string} targetPeer - The target peer address.
   * @returns {Promise<boolean>} True if microphone access was granted and stream started.
   */
  const startVoiceCall = async (targetPeer: string): Promise<boolean> => {
    try {
      console.log("[WebRTC Media] Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = peerConnections.current[targetPeer.toLowerCase()];
      if (pc) {
        const audioSender = pc
          .getSenders()
          .find((s) => s.track === null || s.track?.kind === "audio");
        if (audioSender) {
          await audioSender.replaceTrack(stream.getAudioTracks()[0]);
        } else {
          pc.addTrack(stream.getAudioTracks()[0], stream);
        }
      }

      const audioEl = document.getElementById(
        "p2p-audio-stream",
      ) as HTMLAudioElement;
      if (audioEl) audioEl.play().catch(() => {});

      console.log("[WebRTC Media] Voice stream attached to peer connection.");
      return true;
    } catch (error) {
      console.error(
        "[WebRTC Media Error] Microphone access denied or unavailable.",
        error,
      );
      return false;
    }
  };

  /**
   * Stops the local audio stream and detaches it from the peer connection.
   * @param {string} targetPeer - The target peer address.
   * @returns {void}
   */
  const stopVoiceCall = (targetPeer: string): void => {
    console.log("[WebRTC Media] Terminating active voice stream.");
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    const pc = peerConnections.current[targetPeer.toLowerCase()];
    if (pc) {
      const audioSender = pc
        .getSenders()
        .find((s) => s.track?.kind === "audio");
      if (audioSender) audioSender.replaceTrack(null);
    }

    const audioEl = document.getElementById(
      "p2p-audio-stream",
    ) as HTMLAudioElement;
    if (audioEl) audioEl.pause();
  };

  /**
   * Toggles the mute state of the local microphone stream.
   * @returns {boolean} The new muted state (true if muted).
   */
  const toggleMicMute = (): boolean => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        return !track.enabled;
      }
    }
    return false;
  };

  /**
   * Parses and handles incoming messages from the DataChannel.
   * @param {string} peerAddress - The sender's address.
   * @param {string} encryptedData - The encrypted payload received.
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
            console.log(
              "[WebRTC Signaling] Call offer received via DataChannel.",
            );
            onCallOffer();
            return;
          }
          if (parsed.type === "CALL_ACCEPTED") {
            console.log("[WebRTC Signaling] Call accepted by peer.");
            startVoiceCall(peerAddress).then((success) => {
              if (success && onCallAccepted) onCallAccepted();
            });
            return;
          }
          if (parsed.type === "CALL_REJECTED" && onCallRejected) {
            console.log("[WebRTC Signaling] Call rejected by peer.");
            onCallRejected();
            return;
          }
          if (parsed.type === "CALL_ENDED") {
            console.log("[WebRTC Signaling] Call terminated by peer.");
            stopVoiceCall(peerAddress);
            if (onCallEnded) onCallEnded();
            return;
          }
        } catch {
          console.log("[WebRTC DataChannel] Parsing standard chat payload.");
        }

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
        console.error(
          "[WebRTC DataChannel Error] Failed to parse or save incoming message.",
          error,
        );
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
    ],
  );

  /**
   * Initiates a new WebRTC connection as the offerer.
   * @param {string} targetPeer - The peer address to connect to.
   * @returns {Promise<void>}
   */
  const initiateWebRTCConnection = useCallback(
    async (targetPeer: string): Promise<void> => {
      if (!socket || !targetPeer || !myAddress) return;
      const peerAddress = targetPeer.toLowerCase();

      console.log(
        `[WebRTC] Initiating P2P connection as Offerer to: ${peerAddress}`,
      );

      if (peerConnections.current[peerAddress]) {
        peerConnections.current[peerAddress].close();
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections.current[peerAddress] = pc;
      iceQueues.current[peerAddress] = [];

      pc.addTransceiver("audio", { direction: "sendrecv" });

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

      const dc = pc.createDataChannel("secure_p2p_channel", { ordered: true });
      dataChannels.current[peerAddress] = dc;

      dc.onopen = () => {
        console.log(
          `[WebRTC] DataChannel successfully opened with: ${peerAddress}`,
        );
        setConnectedPeers((prev) => [...new Set([...prev, peerAddress])]);
      };

      dc.onclose = () => {
        console.log(`[WebRTC] DataChannel closed for: ${peerAddress}`);
        setConnectedPeers((prev) => prev.filter((p) => p !== peerAddress));
        if (onPeerDisconnected) onPeerDisconnected(peerAddress);
      };

      dc.onmessage = (msgEvent) =>
        handleIncomingMessage(peerAddress, msgEvent.data);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("webrtc_signal", {
            to: peerAddress,
            signal: { type: "ice-candidate", candidate: event.candidate },
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (
          ["disconnected", "failed", "closed"].includes(pc.iceConnectionState)
        ) {
          console.warn(
            `[WebRTC] Connection state degraded (${pc.iceConnectionState}) for peer: ${peerAddress}`,
          );
          setConnectedPeers((prev) => prev.filter((p) => p !== peerAddress));
          pc.close();
          delete peerConnections.current[peerAddress];
          if (onPeerDisconnected) onPeerDisconnected(peerAddress);
        }
      };

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const myEphemeralPub = !hasSecret(peerAddress)
          ? generateHandshakeKeys(peerAddress)
          : undefined;

        socket.emit("webrtc_signal", {
          to: peerAddress,
          signal: { type: "offer", offer, ephemeralPublicKey: myEphemeralPub },
        });
        console.log(
          "[WebRTC] Local SDP Offer generated and dispatched via signaling server.",
        );
      } catch (error) {
        console.error(
          "[WebRTC Error] Failed to create or send SDP offer.",
          error,
        );
      }
    },
    [
      socket,
      myAddress,
      hasSecret,
      onPeerDisconnected,
      handleIncomingMessage,
      generateHandshakeKeys,
    ],
  );

  useEffect(() => {
    if (!socket || !myAddress) return;

    const handleWebRTCSignal = async (data: { from: string; signal: any }) => {
      const peerAddress = data.from.toLowerCase();
      const { signal } = data;

      if (signal.type === "offer") {
        console.log(
          `[WebRTC] Incoming SDP Offer received from: ${peerAddress}`,
        );

        if (peerConnections.current[peerAddress]) {
          peerConnections.current[peerAddress].close();
          delete peerConnections.current[peerAddress];
          delete iceQueues.current[peerAddress];
          delete dataChannels.current[peerAddress];
          setConnectedPeers((prev) => prev.filter((p) => p !== peerAddress));
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnections.current[peerAddress] = pc;
        iceQueues.current[peerAddress] = [];

        pc.addTransceiver("audio", { direction: "sendrecv" });

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

        pc.ondatachannel = (event) => {
          const dc = event.channel;
          dataChannels.current[peerAddress] = dc;

          dc.onopen = () => {
            console.log(
              `[WebRTC] DataChannel successfully opened with: ${peerAddress}`,
            );
            setConnectedPeers((prev) => [...new Set([...prev, peerAddress])]);
          };

          dc.onclose = () => {
            console.log(`[WebRTC] DataChannel closed for: ${peerAddress}`);
            setConnectedPeers((prev) => prev.filter((p) => p !== peerAddress));
            if (onPeerDisconnected) onPeerDisconnected(peerAddress);
          };

          dc.onmessage = (msgEvent) =>
            handleIncomingMessage(peerAddress, msgEvent.data);
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("webrtc_signal", {
              to: peerAddress,
              signal: { type: "ice-candidate", candidate: event.candidate },
            });
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (
            ["disconnected", "failed", "closed"].includes(pc.iceConnectionState)
          ) {
            console.warn(
              `[WebRTC] Connection state degraded (${pc.iceConnectionState}) for peer: ${peerAddress}`,
            );
            setConnectedPeers((prev) => prev.filter((p) => p !== peerAddress));
            pc.close();
            delete peerConnections.current[peerAddress];
            if (onPeerDisconnected) onPeerDisconnected(peerAddress);
          }
        };

        try {
          await pc.setRemoteDescription(
            new RTCSessionDescription(signal.offer),
          );
          pc.getTransceivers().forEach((t) => (t.direction = "sendrecv"));

          if (
            !hasSecret(peerAddress) &&
            computeSecret &&
            signal.ephemeralPublicKey
          ) {
            computeSecret(peerAddress, signal.ephemeralPublicKey);
          }

          if (iceQueues.current[peerAddress]) {
            for (const cand of iceQueues.current[peerAddress]) {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
            iceQueues.current[peerAddress] = [];
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          const myEphemeralPub = signal.ephemeralPublicKey
            ? generateHandshakeKeys(peerAddress)
            : undefined;

          socket.emit("webrtc_signal", {
            to: peerAddress,
            signal: {
              type: "answer",
              answer,
              ephemeralPublicKey: myEphemeralPub,
            },
          });
          console.log("[WebRTC] Local SDP Answer generated and dispatched.");
        } catch (err) {
          console.error(
            "[WebRTC Signaling Error] Failed to process offer and generate answer.",
            err,
          );
        }
      } else if (signal.type === "answer") {
        console.log(
          `[WebRTC] Incoming SDP Answer received from: ${peerAddress}`,
        );
        const pc = peerConnections.current[peerAddress];
        if (pc && pc.signalingState !== "stable") {
          try {
            await pc.setRemoteDescription(
              new RTCSessionDescription(signal.answer),
            );

            if (
              !hasSecret(peerAddress) &&
              computeSecret &&
              signal.ephemeralPublicKey
            ) {
              computeSecret(peerAddress, signal.ephemeralPublicKey);
            }

            if (iceQueues.current[peerAddress]) {
              for (const cand of iceQueues.current[peerAddress]) {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              }
              iceQueues.current[peerAddress] = [];
            }
          } catch (err) {
            console.error(
              "[WebRTC Signaling Error] Failed to process answer.",
              err,
            );
          }
        }
      } else if (signal.type === "ice-candidate" && signal.candidate) {
        const pc = peerConnections.current[peerAddress];
        if (pc) {
          try {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } else {
              if (!iceQueues.current[peerAddress])
                iceQueues.current[peerAddress] = [];
              iceQueues.current[peerAddress].push(signal.candidate);
            }
          } catch (err) {
            console.error(
              "[WebRTC Signaling Error] Failed to add ICE Candidate.",
              err,
            );
          }
        }
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
    onPeerDisconnected,
  ]);

  /**
   * Transmits encrypted data over the active DataChannel to the target peer.
   * @param {string} targetPeer - The address of the peer.
   * @param {string} encryptedData - The AES-encrypted payload.
   * @returns {void}
   */
  const sendDataViaWebRTC = (
    targetPeer: string,
    encryptedData: string,
  ): void => {
    const peerAddress = targetPeer.toLowerCase();
    const dc = dataChannels.current[peerAddress];
    if (dc?.readyState === "open") {
      dc.send(encryptedData);
    } else {
      console.error(
        `[WebRTC Error] Attempted to send data but DataChannel is not open for peer: ${peerAddress}`,
      );
    }
  };

  return {
    isWebRTCConnected,
    sendDataViaWebRTC,
    initiateWebRTCConnection,
    connectedPeers,
    startVoiceCall,
    stopVoiceCall,
    toggleMicMute,
    forceDisconnectPeer,
  };
};
