import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import { db } from "@/utils/db";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

interface UseWebRTCParams {
  socket: Socket | null;
  myAddress: string | null;
  activeChat: string | null;
  decrypt: (peerAddress: string, encryptedMessage: string) => string;
  setIsPeerTyping?: (isTyping: boolean) => void; // Nambah prop opsional
}

export const useWebRTC = ({
  socket,
  myAddress,
  activeChat,
  decrypt,
  setIsPeerTyping, // Ambil dari param
}: UseWebRTCParams) => {
  const peerConnections = useRef<{ [address: string]: RTCPeerConnection }>({});
  const dataChannels = useRef<{ [address: string]: RTCDataChannel }>({});
  const iceQueues = useRef<{ [address: string]: RTCIceCandidateInit[] }>({});
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isWebRTCConnected = activeChat
    ? connectedPeers.includes(activeChat.toLowerCase())
    : false;

  const initiateWebRTCConnection = useCallback(
    async (targetPeer: string) => {
      if (!socket || !targetPeer || !myAddress) return;
      const peerAddress = targetPeer.toLowerCase();

      if (peerConnections.current[peerAddress]) {
        peerConnections.current[peerAddress].close();
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections.current[peerAddress] = pc;
      iceQueues.current[peerAddress] = [];

      const dc = pc.createDataChannel("secure_p2p_channel", { ordered: true });
      dataChannels.current[peerAddress] = dc;

      dc.onopen = () =>
        setConnectedPeers((prev) => [...new Set([...prev, peerAddress])]);
      dc.onclose = () =>
        setConnectedPeers((prev) => prev.filter((p) => p !== peerAddress));

      dc.onmessage = async (msgEvent) => {
        try {
          const decryptedContent = decrypt(peerAddress, msgEvent.data);

          // CEK: Apakah ini payload TYPING siluman?
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
              return; // Berhenti di sini biar ga disimpen ke database
            }
          } catch (e) {
            // Kalau bukan JSON, lanjut aja
          }

          const isReceivedImage = decryptedContent.startsWith("data:image");

          await db.messages.add({
            ownerAddress: myAddress.toLowerCase(),
            chatId: peerAddress,
            text: decryptedContent,
            isMine: false,
            timestamp: Date.now(),
            isImage: isReceivedImage,
          });
        } catch (error) {
          console.error("Failed to decrypt WebRTC message");
        }
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
          pc.iceConnectionState === "failed"
        ) {
          setConnectedPeers((prev) => prev.filter((p) => p !== peerAddress));
          pc.close();
          delete peerConnections.current[peerAddress];
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("webrtc_signal", {
        to: peerAddress,
        signal: { type: "offer", offer },
      });
    },
    [socket, decrypt, myAddress, setIsPeerTyping],
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

        pc.ondatachannel = (event) => {
          const dc = event.channel;
          dataChannels.current[peerAddress] = dc;

          dc.onopen = () =>
            setConnectedPeers((prev) => [...new Set([...prev, peerAddress])]);
          dc.onclose = () =>
            setConnectedPeers((prev) => prev.filter((p) => p !== peerAddress));

          dc.onmessage = async (msgEvent) => {
            try {
              const decryptedContent = decrypt(peerAddress, msgEvent.data);

              // CEK: Apakah ini payload TYPING siluman (receiver side)
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
                  return; // Berhenti di sini
                }
              } catch (e) {
                // Lanjut
              }

              const isReceivedImage = decryptedContent.startsWith("data:image");

              await db.messages.add({
                ownerAddress: myAddress.toLowerCase(),
                chatId: peerAddress,
                text: decryptedContent,
                isMine: false,
                timestamp: Date.now(),
                isImage: isReceivedImage,
              });
            } catch (error) {
              console.error("Failed to decrypt WebRTC message");
            }
          };
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
            pc.iceConnectionState === "failed"
          ) {
            setConnectedPeers((prev) => prev.filter((p) => p !== peerAddress));
            pc.close();
            delete peerConnections.current[peerAddress];
          }
        };
      }

      const pc = peerConnections.current[peerAddress];

      try {
        if (signal.type === "offer") {
          await pc.setRemoteDescription(
            new RTCSessionDescription(signal.offer),
          );
          if (iceQueues.current[peerAddress]) {
            for (const cand of iceQueues.current[peerAddress]) {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
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
              for (const cand of iceQueues.current[peerAddress]) {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              }
              iceQueues.current[peerAddress] = [];
            }
          }
        } else if (signal.type === "ice-candidate" && signal.candidate) {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
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
  }, [socket, decrypt, myAddress, setIsPeerTyping]);

  const sendDataViaWebRTC = (targetPeer: string, encryptedData: string) => {
    const peerAddress = targetPeer.toLowerCase();
    const dc = dataChannels.current[peerAddress];

    if (dc?.readyState === "open") {
      dc.send(encryptedData);
    }
  };

  return {
    isWebRTCConnected,
    sendDataViaWebRTC,
    initiateWebRTCConnection,
    connectedPeers,
  };
};
