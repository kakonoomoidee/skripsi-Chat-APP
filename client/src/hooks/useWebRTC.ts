import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import { db } from "@/utils/db";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export interface UseWebRTCParams {
  socket: Socket | null;
  myAddress: string | null;
  activeChat: string | null;
  decrypt: (peerAddress: string, encryptedMessage: string) => string;
  encryptLocalDB: (plainText: string) => string;
  setIsPeerTyping?: (isTyping: boolean) => void;
  onCallOffer?: () => void;
  onCallAccepted?: () => void;
  onCallRejected?: () => void;
  onCallEnded?: () => void;
  onPeerDisconnected?: (peerAddress: string) => void;
}

export const useWebRTC = ({
  socket,
  myAddress,
  activeChat,
  decrypt,
  encryptLocalDB,
  setIsPeerTyping,
  onCallOffer,
  onCallAccepted,
  onCallRejected,
  onCallEnded,
  onPeerDisconnected,
}: UseWebRTCParams) => {
  const peerConnections = useRef<{ [address: string]: RTCPeerConnection }>({});
  const dataChannels = useRef<{ [address: string]: RTCDataChannel }>({});
  const iceQueues = useRef<{ [address: string]: RTCIceCandidateInit[] }>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isWebRTCConnected = activeChat
    ? connectedPeers.includes(activeChat.toLowerCase())
    : false;

  useEffect(() => {
    const handleUnload = () => {
      Object.values(dataChannels.current).forEach((dc) => dc.close());
      Object.values(peerConnections.current).forEach((pc) => pc.close());
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      handleUnload();
    };
  }, []);

  const forceDisconnectPeer = useCallback((peerAddress: string) => {
    const addr = peerAddress.toLowerCase();
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

  const startVoiceCall = async (targetPeer: string): Promise<boolean> => {
    try {
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
      return true;
    } catch {
      return false;
    }
  };

  const stopVoiceCall = (targetPeer: string): void => {
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

      dc.onopen = () =>
        setConnectedPeers((prev) => [...new Set([...prev, peerAddress])]);
      dc.onclose = () => {
        setConnectedPeers((prev) => prev.filter((p) => p !== peerAddress));
        if (onPeerDisconnected) onPeerDisconnected(peerAddress);
      };

      dc.onmessage = async (msgEvent) => {
        try {
          const decryptedContent = decrypt(peerAddress, msgEvent.data);
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
              startVoiceCall(peerAddress).then((success) => {
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

          const isReceivedImage = decryptedContent.startsWith("data:image");
          await db.messages.add({
            ownerAddress: myAddress.toLowerCase(),
            chatId: peerAddress,
            text: encryptLocalDB(decryptedContent),
            isMine: false,
            timestamp: Date.now(),
            isImage: isReceivedImage,
          });
        } catch {}
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
          pc.iceConnectionState === "disconnected" ||
          pc.iceConnectionState === "failed" ||
          pc.iceConnectionState === "closed"
        ) {
          setConnectedPeers((prev) => prev.filter((p) => p !== peerAddress));
          pc.close();
          delete peerConnections.current[peerAddress];
          if (onPeerDisconnected) onPeerDisconnected(peerAddress);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("webrtc_signal", {
        to: peerAddress,
        signal: { type: "offer", offer },
      });
    },
    [
      socket,
      decrypt,
      encryptLocalDB,
      myAddress,
      setIsPeerTyping,
      onCallOffer,
      onCallAccepted,
      onCallRejected,
      onCallEnded,
      onPeerDisconnected,
    ],
  );

  useEffect(() => {
    if (!socket || !myAddress) return;

    const handleWebRTCSignal = async (data: { from: string; signal: any }) => {
      const peerAddress = data.from.toLowerCase();
      const { signal } = data;

      if (signal.type === "offer" && peerConnections.current[peerAddress]) {
        peerConnections.current[peerAddress].close();
        delete peerConnections.current[peerAddress];
        delete iceQueues.current[peerAddress];
        delete dataChannels.current[peerAddress];
        setConnectedPeers((prev) => prev.filter((p) => p !== peerAddress));
      }

      if (!peerConnections.current[peerAddress]) {
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
          dc.onopen = () =>
            setConnectedPeers((prev) => [...new Set([...prev, peerAddress])]);
          dc.onclose = () => {
            setConnectedPeers((prev) => prev.filter((p) => p !== peerAddress));
            if (onPeerDisconnected) onPeerDisconnected(peerAddress);
          };
          dc.onmessage = async (msgEvent) => {
            try {
              const decryptedContent = decrypt(peerAddress, msgEvent.data);
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
                  startVoiceCall(peerAddress).then((success) => {
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
              const isReceivedImage = decryptedContent.startsWith("data:image");
              await db.messages.add({
                ownerAddress: myAddress.toLowerCase(),
                chatId: peerAddress,
                text: encryptLocalDB(decryptedContent),
                isMine: false,
                timestamp: Date.now(),
                isImage: isReceivedImage,
              });
            } catch {}
          };
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
            pc.iceConnectionState === "disconnected" ||
            pc.iceConnectionState === "failed" ||
            pc.iceConnectionState === "closed"
          ) {
            setConnectedPeers((prev) => prev.filter((p) => p !== peerAddress));
            pc.close();
            delete peerConnections.current[peerAddress];
            if (onPeerDisconnected) onPeerDisconnected(peerAddress);
          }
        };
      }

      const pc = peerConnections.current[peerAddress];
      try {
        if (signal.type === "offer") {
          await pc.setRemoteDescription(
            new RTCSessionDescription(signal.offer),
          );
          pc.getTransceivers().forEach((t) => (t.direction = "sendrecv"));
          if (iceQueues.current[peerAddress]) {
            for (const cand of iceQueues.current[peerAddress])
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            iceQueues.current[peerAddress] = [];
          }
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("webrtc_signal", {
            to: peerAddress,
            signal: { type: "answer", answer },
          });
        } else if (signal.type === "answer") {
          if (pc.signalingState !== "stable") {
            await pc.setRemoteDescription(
              new RTCSessionDescription(signal.answer),
            );
            if (iceQueues.current[peerAddress]) {
              for (const cand of iceQueues.current[peerAddress])
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              iceQueues.current[peerAddress] = [];
            }
          }
        } else if (signal.type === "ice-candidate" && signal.candidate) {
          if (pc.remoteDescription)
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          else {
            if (!iceQueues.current[peerAddress])
              iceQueues.current[peerAddress] = [];
            iceQueues.current[peerAddress].push(signal.candidate);
          }
        }
      } catch (err) {
        console.error("WebRTC Signaling Error:", err);
      }
    };

    socket.on("webrtc_signal", handleWebRTCSignal);
    return () => {
      socket.off("webrtc_signal", handleWebRTCSignal);
    };
  }, [
    socket,
    decrypt,
    encryptLocalDB,
    myAddress,
    setIsPeerTyping,
    onCallOffer,
    onCallAccepted,
    onCallRejected,
    onCallEnded,
    onPeerDisconnected,
  ]);

  const sendDataViaWebRTC = (
    targetPeer: string,
    encryptedData: string,
  ): void => {
    const peerAddress = targetPeer.toLowerCase();
    const dc = dataChannels.current[peerAddress];
    if (dc?.readyState === "open") dc.send(encryptedData);
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
