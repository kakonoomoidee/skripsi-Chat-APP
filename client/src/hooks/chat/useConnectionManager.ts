import { useEffect, useRef } from "react";
import { useChatStore } from "@/store/useChatStore";
import ms from "ms";

/**
 * Interface defining the dependencies for the useConnectionManager hook.
 */
export interface UseConnectionManagerProps {
  checkPeerStatus: (addr: string) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
  removeActiveSession: (addr: string) => void;
  isWebRTCConnected: boolean;
  encrypt: (peer: string, data: string) => string | null;
  sendDataViaWebRTC: (peer: string, data: string) => void;
  connectedPeers: string[];
  hasSecret: (addr: string) => boolean;
  initiateWebRTCConnection: (addr: string) => Promise<void>;
  initiateHandshake: (addr: string) => void;
}

/**
 * Custom hook to manage the P2P connection state machine.
 * Handles auto-pinging, reconnects, WebRTC transition state, and avatar syncing.
 *
 * @param {UseConnectionManagerProps} props - Hook dependencies.
 * @returns {object} Handlers for WebRTC and signaling events.
 */
export const useConnectionManager = ({
  checkPeerStatus,
  showToast,
  removeActiveSession,
  isWebRTCConnected,
  encrypt,
  sendDataViaWebRTC,
  connectedPeers,
  hasSecret,
  initiateWebRTCConnection,
  initiateHandshake,
}: UseConnectionManagerProps) => {
  const { activeChat, initiators, connectionStates, setConnectionStates } = useChatStore();

  const webrtcInitiated = useRef<{ [addr: string]: boolean }>({});
  const connectedPeersRef = useRef<string[]>([]);
  const avatarSyncedPeers = useRef<{ [addr: string]: boolean }>({});
  const pingTimeoutRef = useRef<{ [addr: string]: NodeJS.Timeout }>({});
  const reconnectIntervalRef = useRef<{ [addr: string]: NodeJS.Timeout }>({});
  const pendingWebRTCAfterHandshake = useRef<Set<string>>(new Set());

  useEffect(() => {
    connectedPeersRef.current = connectedPeers;
  }, [connectedPeers]);

  useEffect(() => {
    const current = activeChat?.toLowerCase();

    if (!current) {
      return;
    }

    if (connectedPeersRef.current.includes(current)) {
      setConnectionStates((prev) => ({ ...prev, [current]: "connected" }));
      return;
    }

    if (initiators[current] !== true) return;

    if (webrtcInitiated.current[current]) return;

    webrtcInitiated.current[current] = true;
    setConnectionStates((prev) => ({ ...prev, [current]: "connecting" }));

    checkPeerStatus(current);

    pingTimeoutRef.current[current] = setTimeout(() => {
      delete pingTimeoutRef.current[current];
      pendingWebRTCAfterHandshake.current.delete(current);
      setConnectionStates((prev) => ({ ...prev, [current]: "idle" }));
      showToast("Peer is offline or unreachable.", "error");
      removeActiveSession(current);
    }, ms("5s"));
  }, [activeChat, checkPeerStatus, initiators, showToast, removeActiveSession, setConnectionStates]);

  useEffect(() => {
    return () => {
      Object.values(pingTimeoutRef.current).forEach((t) => clearTimeout(t));
      Object.values(reconnectIntervalRef.current).forEach((t) => clearInterval(t));
    };
  }, []);

  useEffect(() => {
    if (!isWebRTCConnected || !activeChat) return;
    const current = activeChat.toLowerCase();

    if (pingTimeoutRef.current[current]) {
      clearTimeout(pingTimeoutRef.current[current]);
      delete pingTimeoutRef.current[current];
    }
    if (reconnectIntervalRef.current[current]) {
      clearInterval(reconnectIntervalRef.current[current]);
      delete reconnectIntervalRef.current[current];
    }
    
    webrtcInitiated.current[current] = false;
    setConnectionStates((prev) => ({ ...prev, [current]: "connected" }));
  }, [isWebRTCConnected, activeChat, setConnectionStates]);

  useEffect(() => {
    if (!isWebRTCConnected || !activeChat) return;
    const peer = activeChat.toLowerCase();
    if (avatarSyncedPeers.current[peer]) return;
    const myAvatar = localStorage.getItem("my_avatar");
    if (!myAvatar) return;
    avatarSyncedPeers.current[peer] = true;
    const payload = JSON.stringify({ type: "PROFILE_SYNC", avatar: myAvatar });
    const encrypted = encrypt(peer, payload);
    if (encrypted) sendDataViaWebRTC(peer, encrypted);
  }, [isWebRTCConnected, activeChat, encrypt, sendDataViaWebRTC]);

  useEffect(() => {
    if (!activeChat) return;
    const peer = activeChat.toLowerCase();
    return () => {
      delete avatarSyncedPeers.current[peer];
    };
  }, [activeChat]);

  useEffect(() => {
    const current = activeChat?.toLowerCase();

    if (current && connectionStates[current] === "offline") {
      if (reconnectIntervalRef.current[current]) {
        clearInterval(reconnectIntervalRef.current[current]);
      }

      reconnectIntervalRef.current[current] = setInterval(() => {
        if (connectedPeersRef.current.includes(current)) {
          if (reconnectIntervalRef.current[current]) {
            clearInterval(reconnectIntervalRef.current[current]);
            delete reconnectIntervalRef.current[current];
          }
          setConnectionStates((prev) => ({ ...prev, [current]: "connected" }));
          return;
        }
        webrtcInitiated.current[current] = false;
        checkPeerStatus(current);
      }, ms("10s"));
    } else if (current) {
      if (reconnectIntervalRef.current[current]) {
        clearInterval(reconnectIntervalRef.current[current]);
        delete reconnectIntervalRef.current[current];
      }
    }
  }, [connectionStates, activeChat, checkPeerStatus, setConnectionStates]);

  const handlePongReceived = (peerAddress: string) => {
    const addr = peerAddress.toLowerCase();
    if (pingTimeoutRef.current[addr]) {
      clearTimeout(pingTimeoutRef.current[addr]);
      delete pingTimeoutRef.current[addr];
    }

    setConnectionStates((prev) => ({ ...prev, [addr]: "connecting" }));

    if (hasSecret(addr)) {
      initiateWebRTCConnection(addr);
    } else {
      pendingWebRTCAfterHandshake.current.add(addr);
      initiateHandshake(addr);
    }
  };

  const handleHandshakeComplete = (peerAddress: string) => {
    const addr = peerAddress.toLowerCase();
    if (pendingWebRTCAfterHandshake.current.has(addr)) {
      pendingWebRTCAfterHandshake.current.delete(addr);
      initiateWebRTCConnection(addr);
    }
  };

  const handlePeerDisconnected = (peerAddress: string) => {
    const addr = peerAddress.toLowerCase();
    webrtcInitiated.current[addr] = false;
    showToast("Peer disconnected.", "error");
    setConnectionStates((prev) => ({ ...prev, [addr]: "offline" }));
  };

  return {
    handlePongReceived,
    handleHandshakeComplete,
    handlePeerDisconnected,
  };
};
