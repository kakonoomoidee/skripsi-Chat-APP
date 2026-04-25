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
 * Duration in milliseconds before an unresolved WebRTC handshake
 * (data channel not yet open) is forcibly killed.
 */
const HANDSHAKE_TIMEOUT_MS = 8000;

/**
 * Duration in milliseconds before an offer with zero relay-level response
 * is treated as an unreachable peer and the connection is torn down.
 */
const SIGNALING_TIMEOUT_MS = 10000;

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
    onSignalingTimeout,
    encrypt,
  } = props;

  const peerConnections = useRef<{ [address: string]: RTCPeerConnection }>({});
  const iceQueues = useRef<{ [address: string]: RTCIceCandidateInit[] }>({});

  /**
   * Per-peer handshake timeout handles. Armed after offer/answer emit;
   * cancelled on data-channel open or successful ICE transition.
   */
  const handshakeTimers = useRef<{ [address: string]: ReturnType<typeof setTimeout> }>({});

  /**
   * Per-peer relay-signaling timeout handles. Armed when an offer is emitted;
   * cancelled the moment any relay response arrives from the peer.
   */
  const signalingTimers = useRef<{ [address: string]: ReturnType<typeof setTimeout> }>({});

  /**
   * "Graveyard" set of peer addresses whose signaling timer already expired.
   * Any late-arriving socket packet for a dead peer is silently dropped,
   * preventing zombie resurrections that would re-enter the connecting state.
   */
  const deadPeersRef = useRef(new Set<string>());

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
      startVoiceCall,
      stopVoiceCall,
    });

  /**
   * Attaches the remote media stream to the hidden audio element.
   *
   * @param {RTCPeerConnection} pc - The active peer connection.
   * @returns {void}
   */
  const setupAudioTrack = (pc: RTCPeerConnection): void => {
    pc.ontrack = (event) => {
      let audioEl = document.getElementById("p2p-audio-stream") as HTMLAudioElement;
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
   * Cancels the pending handshake timer for a peer if one is active.
   *
   * @param {string} addr - Lowercase peer wallet address.
   * @returns {void}
   */
  const cancelHandshakeTimer = (addr: string): void => {
    if (handshakeTimers.current[addr]) {
      clearTimeout(handshakeTimers.current[addr]);
      delete handshakeTimers.current[addr];
    }
  };

  /**
   * Cancels the pending signaling timer for a peer if one is active.
   *
   * @param {string} addr - Lowercase peer wallet address.
   * @returns {void}
   */
  const cancelSignalingTimer = (addr: string): void => {
    if (signalingTimers.current[addr]) {
      clearTimeout(signalingTimers.current[addr]);
      delete signalingTimers.current[addr];
    }
  };

  /**
   * Performs a complete hard-kill of all resources tied to a peer connection.
   *
   * Sequence:
   * 1. Cancels both pending timers (handshake and signaling).
   * 2. Nulls all event handler slots on the RTCPeerConnection to prevent
   *    stale callbacks from firing against the already-removed map entry.
   * 3. Calls `pc.close()` and removes the entry from `peerConnections`.
   * 4. Nulls and closes the associated RTCDataChannel.
   * 5. Uses the functional updater form of `setConnectedPeers` to guarantee
   *    the filter operates on the latest state regardless of closure age.
   * 6. Invokes `onPeerDisconnected` to notify the parent context.
   *
   * @param {string} peerAddress - The wallet address of the peer to kill.
   * @returns {void}
   */
  const cleanupPeerConnection = useCallback(
    (peerAddress: string): void => {
      const addr = peerAddress.toLowerCase();

      cancelHandshakeTimer(addr);
      cancelSignalingTimer(addr);

      const pc = peerConnections.current[addr];
      if (pc) {
        pc.onconnectionstatechange = null;
        pc.oniceconnectionstatechange = null;
        pc.onicecandidate = null;
        pc.ondatachannel = null;
        pc.ontrack = null;
        pc.close();
        delete peerConnections.current[addr];
      }

      const dc = dataChannels.current[addr];
      if (dc) {
        dc.onopen = null;
        dc.onclose = null;
        dc.onmessage = null;
        dc.close();
        delete dataChannels.current[addr];
      }

      setConnectedPeers((prev) => prev.filter((p) => p !== addr));

      if (onPeerDisconnected) onPeerDisconnected(addr);
    },
    [onPeerDisconnected, dataChannels],
  );

  /**
   * Alias exposed on the return object so external callers retain the
   * original `forceDisconnectPeer` API without change.
   */
  const forceDisconnectPeer = cleanupPeerConnection;

  /**
   * Arms the 8-second data-channel handshake timer for a peer.
   * If it fires before `dc.onopen`, `cleanupPeerConnection` is called.
   * Cancels any previously active timer for the same peer first.
   *
   * @param {string} peerAddress - Lowercase peer wallet address.
   * @returns {void}
   */
  const armHandshakeTimer = useCallback(
    (peerAddress: string): void => {
      const addr = peerAddress.toLowerCase();
      cancelHandshakeTimer(addr);
      handshakeTimers.current[addr] = setTimeout(() => {
        delete handshakeTimers.current[addr];
        if (peerConnections.current[addr]) {
          cleanupPeerConnection(addr);
        }
      }, HANDSHAKE_TIMEOUT_MS);
    },
    [cleanupPeerConnection],
  );

  /**
   * Arms the 10-second relay-signaling watchdog immediately after an offer is
   * emitted. If it fires it means the relay received zero response from the peer.
   *
   * @param {string} peerAddress - Lowercase peer wallet address.
   * @returns {void}
   */
  const armSignalingTimer = useCallback(
    (peerAddress: string): void => {
      const addr = peerAddress.toLowerCase();
      cancelSignalingTimer(addr);
      console.warn("[WebRTC] Signaling timer armed for:", addr);
      signalingTimers.current[addr] = setTimeout(() => {
        delete signalingTimers.current[addr];
        console.warn("[WebRTC] Timeout Enforced & State Locked for:", addr);
        deadPeersRef.current.add(addr);
        cleanupPeerConnection(addr);
        if (onSignalingTimeout) onSignalingTimeout(addr);
      }, SIGNALING_TIMEOUT_MS);
    },
    [cleanupPeerConnection, onSignalingTimeout],
  );

  /**
   * Constructs and attaches `onconnectionstatechange` and
   * `oniceconnectionstatechange` listeners to a peer connection.
   *
   * On a successful transition both pending timers are cancelled.
   * On any terminal failure state `cleanupPeerConnection` is invoked.
   *
   * @param {RTCPeerConnection} pc - The peer connection to instrument.
   * @param {string} addr - Lowercase peer wallet address.
   * @returns {void}
   */
  const attachStateListeners = useCallback(
    (pc: RTCPeerConnection, addr: string): void => {
      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === "connected") {
          cancelHandshakeTimer(addr);
          cancelSignalingTimer(addr);
        }
        if (s === "failed" || s === "disconnected" || s === "closed") {
          cleanupPeerConnection(addr);
        }
      };

      pc.oniceconnectionstatechange = () => {
        const s = pc.iceConnectionState;
        if (s === "connected" || s === "completed") {
          cancelHandshakeTimer(addr);
          cancelSignalingTimer(addr);
        }
        if (s === "failed" || s === "disconnected" || s === "closed") {
          cleanupPeerConnection(addr);
        }
      };
    },
    [cleanupPeerConnection],
  );

  /**
   * Initiates the P2P connection as the offerer.
   * Removes the peer from the graveyard before attempting a fresh connection
   * so that a deliberate retry (after a previous timeout) is not blocked.
   * Arms both the signaling and handshake timers after emitting the offer.
   *
   * @param {string} targetPeer - The address of the target peer.
   * @returns {Promise<void>}
   */
  const initiateWebRTCConnection = useCallback(
    async (targetPeer: string): Promise<void> => {
      if (!socket || !targetPeer || !myAddress) return;
      const addr = targetPeer.toLowerCase();

      deadPeersRef.current.delete(addr);

      if (peerConnections.current[addr]) {
        peerConnections.current[addr].onconnectionstatechange = null;
        peerConnections.current[addr].oniceconnectionstatechange = null;
        peerConnections.current[addr].onicecandidate = null;
        peerConnections.current[addr].close();
        delete peerConnections.current[addr];
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections.current[addr] = pc;
      iceQueues.current[addr] = [];

      pc.addTransceiver("audio", { direction: "sendrecv" });
      setupAudioTrack(pc);

      const dc = pc.createDataChannel("secure_p2p_channel", { ordered: true });
      dataChannels.current[addr] = dc;

      dc.onopen = () => {
        cancelHandshakeTimer(addr);
        cancelSignalingTimer(addr);
        setConnectedPeers((prev) => [...new Set([...prev, addr])]);
      };
      dc.onclose = () => cleanupPeerConnection(addr);
      dc.onmessage = (e) => handleIncomingMessage(addr, e.data);

      pc.onicecandidate = (event) => {
        if (event.candidate)
          socket.emit("webrtc_signal", {
            to: addr,
            signal: { type: "ice-candidate", candidate: event.candidate },
          });
      };

      attachStateListeners(pc, addr);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("webrtc_signal", {
        to: addr,
        signal: {
          type: "offer",
          offer,
          ephemeralPublicKey: !hasSecret(addr)
            ? generateHandshakeKeys(addr)
            : undefined,
        },
      });

      armSignalingTimer(addr);
      armHandshakeTimer(addr);
    },
    [
      socket,
      myAddress,
      hasSecret,
      generateHandshakeKeys,
      handleIncomingMessage,
      dataChannels,
      cleanupPeerConnection,
      attachStateListeners,
      armHandshakeTimer,
      armSignalingTimer,
    ],
  );

  useEffect(() => {
    if (!socket || !myAddress) return;

    /**
     * Processes incoming WebRTC signaling messages from the relay server.
     *
     * Guard clause: if the sender's address is in `deadPeersRef`, the packet
     * is silently dropped. This prevents late-arriving relay packets from
     * resurrecting a connection whose signaling timer already expired.
     *
     * For `answer` and `ice-candidate`: cancels the signaling timer immediately
     * since any relay response proves the peer is reachable.
     *
     * @param {{ from: string; signal: any }} data - Signaling payload.
     * @returns {Promise<void>}
     */
    const handleWebRTCSignal = async (data: { from: string; signal: any }): Promise<void> => {
      const addr = data.from.toLowerCase();
      const { signal } = data;

      if (deadPeersRef.current.has(addr)) return;

      if (signal.type === "offer") {
        if (peerConnections.current[addr]) {
          peerConnections.current[addr].onconnectionstatechange = null;
          peerConnections.current[addr].oniceconnectionstatechange = null;
          peerConnections.current[addr].onicecandidate = null;
          peerConnections.current[addr].ondatachannel = null;
          peerConnections.current[addr].close();
          delete peerConnections.current[addr];
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnections.current[addr] = pc;
        iceQueues.current[addr] = [];

        setupAudioTrack(pc);

        pc.ondatachannel = (event) => {
          const dc = event.channel;
          dataChannels.current[addr] = dc;
          dc.onopen = () => {
            cancelHandshakeTimer(addr);
            cancelSignalingTimer(addr);
            setConnectedPeers((prev) => [...new Set([...prev, addr])]);
          };
          dc.onclose = () => cleanupPeerConnection(addr);
          dc.onmessage = (e) => handleIncomingMessage(addr, e.data);
        };

        pc.onicecandidate = (event) => {
          if (event.candidate)
            socket.emit("webrtc_signal", {
              to: addr,
              signal: { type: "ice-candidate", candidate: event.candidate },
            });
        };

        attachStateListeners(pc, addr);

        await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
        pc.getTransceivers().forEach((t) => (t.direction = "sendrecv"));

        if (!hasSecret(addr) && computeSecret && signal.ephemeralPublicKey) {
          computeSecret(addr, signal.ephemeralPublicKey);
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("webrtc_signal", {
          to: addr,
          signal: {
            type: "answer",
            answer,
            ephemeralPublicKey: signal.ephemeralPublicKey
              ? generateHandshakeKeys(addr)
              : undefined,
          },
        });

        armHandshakeTimer(addr);
      } else if (signal.type === "answer") {
        cancelSignalingTimer(addr);
        const pc = peerConnections.current[addr];
        if (pc)
          await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
      } else if (signal.type === "ice-candidate" && signal.candidate) {
        cancelSignalingTimer(addr);
        const pc = peerConnections.current[addr];
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
    cleanupPeerConnection,
    attachStateListeners,
    armHandshakeTimer,
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
