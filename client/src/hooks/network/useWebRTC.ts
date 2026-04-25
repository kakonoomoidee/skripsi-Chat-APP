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
 * Implements a ping-first reachability check: before any SDP negotiation begins,
 * the target peer is verified online via a lightweight relay ping/pong probe.
 *
 * @param {any} props - Dependencies injected from ChatContext.
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
    onPongReceived,
    encrypt,
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
      startVoiceCall,
      stopVoiceCall,
    });

  /**
   * Attaches the remote media stream to the hidden audio element in the DOM.
   * Creates the element lazily on first track event if it does not yet exist.
   *
   * @param {RTCPeerConnection} pc - The active peer connection emitting the track.
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
   * Performs a complete hard-kill of all resources tied to a peer connection.
   *
   * Sequence:
   * 1. Nulls all event handler slots on the RTCPeerConnection to prevent stale
   *    callbacks from firing after the map entry is removed.
   * 2. Calls pc.close() and deletes the entry from peerConnections.
   * 3. Closes the associated RTCDataChannel and removes it from dataChannels.
   * 4. Uses the functional updater of setConnectedPeers to guarantee the filter
   *    operates on the latest state regardless of closure age.
   * 5. Invokes onPeerDisconnected to notify the parent context.
   *
   * @param {string} peerAddress - The wallet address of the peer to clean up.
   * @returns {void}
   */
  const cleanupPeerConnection = useCallback(
    (peerAddress: string): void => {
      const addr = peerAddress.toLowerCase();

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

  const forceDisconnectPeer = cleanupPeerConnection;

  /**
   * Attaches onconnectionstatechange and oniceconnectionstatechange listeners
   * to a peer connection. On any terminal failure state cleanupPeerConnection
   * is invoked to release all associated resources.
   *
   * @param {RTCPeerConnection} pc   - The peer connection to instrument.
   * @param {string}            addr - Lowercase peer wallet address.
   * @returns {void}
   */
  const attachStateListeners = useCallback(
    (pc: RTCPeerConnection, addr: string): void => {
      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === "failed" || s === "disconnected" || s === "closed") {
          cleanupPeerConnection(addr);
        }
      };

      pc.oniceconnectionstatechange = () => {
        const s = pc.iceConnectionState;
        if (s === "failed" || s === "disconnected" || s === "closed") {
          cleanupPeerConnection(addr);
        }
      };
    },
    [cleanupPeerConnection],
  );

  /**
   * Emits a lightweight ping signal through the relay server to check whether
   * the target peer is currently online before initiating a full WebRTC handshake.
   *
   * @param {string} targetPeer - The wallet address of the peer to probe.
   * @returns {void}
   */
  const checkPeerStatus = useCallback(
    (targetPeer: string): void => {
      if (!socket || !targetPeer) return;
      socket.emit("webrtc_signal", {
        to: targetPeer.toLowerCase(),
        signal: { type: "ping" },
      });
    },
    [socket],
  );

  /**
   * Initiates the P2P connection as the offerer. Tears down any pre-existing
   * RTCPeerConnection for the target before creating a fresh one, attaches
   * the data channel and audio transceiver, then emits an SDP offer via the relay.
   * Should only be called after a successful pong is received for the target peer.
   *
   * @param {string} targetPeer - The wallet address of the peer to connect to.
   * @returns {Promise<void>}
   */
  const initiateWebRTCConnection = useCallback(
    async (targetPeer: string): Promise<void> => {
      if (!socket || !targetPeer || !myAddress) return;
      const addr = targetPeer.toLowerCase();

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

      dc.onopen = () => setConnectedPeers((prev) => [...new Set([...prev, addr])]);
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
    ],
  );

  useEffect(() => {
    if (!socket || !myAddress) return;

    /**
     * Processes incoming WebRTC signaling messages from the relay server.
     *
     * Handles:
     * - ping  — responds immediately with a pong so the sender knows this peer is online.
     * - pong  — forwards the event to onPongReceived so the parent can initiate the handshake.
     * - offer — creates an answerer-side RTCPeerConnection, sets the remote description,
     *           derives the shared secret if needed, and emits an SDP answer.
     * - answer       — sets the remote description on the existing offerer connection.
     * - ice-candidate — queues the candidate on the existing connection once remote
     *                   description is available.
     *
     * @param {{ from: string; signal: any }} data - Signaling payload from the relay.
     * @returns {Promise<void>}
     */
    const handleWebRTCSignal = async (data: {
      from: string;
      signal: any;
    }): Promise<void> => {
      const addr = data.from.toLowerCase();
      const { signal } = data;

      if (signal.type === "ping") {
        socket.emit("webrtc_signal", {
          to: addr,
          signal: { type: "pong" },
        });
        return;
      }

      if (signal.type === "pong") {
        if (onPongReceived) onPongReceived(addr);
        return;
      }

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
          dc.onopen = () =>
            setConnectedPeers((prev) => [...new Set([...prev, addr])]);
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
      } else if (signal.type === "answer") {
        const pc = peerConnections.current[addr];
        if (pc)
          await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
      } else if (signal.type === "ice-candidate" && signal.candidate) {
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
    onPongReceived,
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
    checkPeerStatus,
  };
};