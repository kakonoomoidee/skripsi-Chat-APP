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
  activeChat: string | null;
  decrypt: (peerAddress: string, encryptedMessage: string) => string;
}

/**
 * 1. Manage WebRTC Peer-to-Peer connection for direct data sharing
 * @param {UseWebRTCParams} params - Socket instance, target peer address, and decrypt function
 * @returns {object} { isWebRTCConnected, sendDataViaWebRTC, initiateWebRTCConnection }
 */
export const useWebRTC = ({ socket, activeChat, decrypt }: UseWebRTCParams) => {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const [isWebRTCConnected, setIsWebRTCConnected] = useState<boolean>(false);

  /**
   * 2. Initialize WebRTC connection, setup Data Channel, and send Offer to peer
   * @returns {Promise<void>}
   */
  const initiateWebRTCConnection = useCallback(async () => {
    if (!socket || !activeChat) return;

    if (peerConnectionRef.current) peerConnectionRef.current.close();

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    const dc = pc.createDataChannel("secure_p2p_channel", { ordered: true });
    dataChannelRef.current = dc;

    dc.onopen = () => {
      console.log("WebRTC Data Channel is OPEN");
      setIsWebRTCConnected(true);
    };
    dc.onclose = () => setIsWebRTCConnected(false);

    dc.onmessage = async (msgEvent) => {
      try {
        const decryptedContent = decrypt(activeChat, msgEvent.data);

        // FIX: Detect if the content is an image base64 string
        const isReceivedImage = decryptedContent.startsWith("data:image");

        await db.messages.add({
          chatId: activeChat,
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
          to: activeChat,
          signal: { type: "ice-candidate", candidate: event.candidate },
        });
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("webrtc_signal", {
      to: activeChat,
      signal: { type: "offer", offer },
    });
  }, [socket, activeChat, decrypt]);

  useEffect(() => {
    if (!socket || !activeChat) return;

    const handleWebRTCSignal = async (data: { from: string; signal: any }) => {
      if (data.from !== activeChat) return;
      const { signal } = data;

      if (!peerConnectionRef.current) {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionRef.current = pc;

        pc.ondatachannel = (event) => {
          const dc = event.channel;
          dataChannelRef.current = dc;

          dc.onopen = () => {
            console.log("WebRTC Data Channel RECEIVED & OPEN");
            setIsWebRTCConnected(true);
          };
          dc.onclose = () => setIsWebRTCConnected(false);

          dc.onmessage = async (msgEvent) => {
            try {
              const decryptedContent = decrypt(data.from, msgEvent.data);

              // FIX: Detect image in receiver's logic as well
              const isReceivedImage = decryptedContent.startsWith("data:image");

              await db.messages.add({
                chatId: data.from,
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
              to: data.from,
              signal: { type: "ice-candidate", candidate: event.candidate },
            });
          }
        };
      }

      const pc = peerConnectionRef.current;

      try {
        if (signal.type === "offer") {
          await pc.setRemoteDescription(
            new RTCSessionDescription(signal.offer),
          );
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("webrtc_signal", {
            to: data.from,
            signal: { type: "answer", answer },
          });
        } else if (signal.type === "answer") {
          if (pc.signalingState !== "stable") {
            await pc.setRemoteDescription(
              new RTCSessionDescription(signal.answer),
            );
          }
        } else if (signal.type === "ice-candidate" && signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error("WebRTC Signaling Error:", err);
      }
    };

    socket.on("webrtc_signal", handleWebRTCSignal);
    return () => {
      socket.off("webrtc_signal", handleWebRTCSignal);
    };
  }, [socket, activeChat, decrypt]);

  /**
   * 3. Transmit encrypted data via established Data Channel
   * @param {string} encryptedData - The AES-256 encrypted string
   * @returns {void}
   */
  const sendDataViaWebRTC = (encryptedData: string) => {
    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(encryptedData);
    } else {
      console.warn("WebRTC Channel not open");
    }
  };

  return { isWebRTCConnected, sendDataViaWebRTC, initiateWebRTCConnection };
};
