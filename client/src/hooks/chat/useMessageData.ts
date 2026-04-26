import { useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/utils/db";
import ms from "ms";

const HIDDEN_PROTOCOL_TYPES = new Set([
  "PROFILE_SYNC",
  "WALLET_REQUEST",
  "WALLET_RESPONSE",
]);

/**
 * Determines whether a decrypted message is an internal protocol payload that
 * must not be rendered in user-facing UI.
 *
 * @param {string} text - Decrypted message content.
 * @returns {boolean} True when the message should be hidden from UI rendering.
 */
const shouldHideProtocolMessage = (text: string): boolean => {
  const normalized = text.trim();
  if (!normalized) return false;
  if (!normalized.startsWith("{")) return false;
  try {
    const parsed = JSON.parse(normalized) as { type?: unknown };
    if (!parsed || typeof parsed !== "object") return false;
    if (typeof parsed.type !== "string") return false;
    return HIDDEN_PROTOCOL_TYPES.has(parsed.type);
  } catch {
    return false;
  }
};

/**
 * Interface defining the dependencies for the useMessageData hook.
 */
export interface UseMessageDataProps {
  address: string | null;
  activeChat: string | null;
  isWebRTCConnected: boolean;
  sendMarkAsRead: (peerAddress: string) => void;
  decryptLocalDB: (cipher: string) => string;
  autoDeleteMode: string;
}

/**
 * Custom hook to handle message data retrieval, decryption, and unread counts.
 * Also manages the auto-delete sweep and mark-as-read side effects.
 *
 * @param {UseMessageDataProps} props - Dependencies.
 * @returns {object} Extracted messages and unread counts.
 */
export const useMessageData = ({
  address,
  activeChat,
  isWebRTCConnected,
  sendMarkAsRead,
  decryptLocalDB,
  autoDeleteMode,
}: UseMessageDataProps) => {
  const rawMessages = useLiveQuery(
    () => {
      if (!activeChat || !address) return [];
      return db.messages
        .where({
          ownerAddress: address.toLowerCase(),
          chatId: activeChat.toLowerCase(),
        })
        .sortBy("timestamp");
    },
    [activeChat, address],
    [],
  );

  const messages = useMemo(() => {
    if (!rawMessages) return [];
    return rawMessages
      .map((msg) => ({
        ...msg,
        text: decryptLocalDB(msg.text),
      }))
      .filter((msg) => !shouldHideProtocolMessage(msg.text));
  }, [rawMessages, decryptLocalDB]);

  const globalUnreadMessages = useLiveQuery(
    () => {
      if (!address) return [];
      return db.messages
        .filter(
          (msg) =>
            msg.ownerAddress === address.toLowerCase() &&
            !msg.isMine &&
            msg.status !== "read",
        )
        .toArray();
    },
    [address],
    [],
  );

  const unreadCount = useMemo(() => {
    const counts: Record<string, number> = {};
    if (globalUnreadMessages) {
      globalUnreadMessages.forEach((msg) => {
        counts[msg.chatId] = (counts[msg.chatId] || 0) + 1;
      });
    }
    return counts;
  }, [globalUnreadMessages]);

  useEffect(() => {
    const sweepOldMessages = async () => {
      if (autoDeleteMode === "never" || autoDeleteMode === "close") return;
      const now = Date.now();
      let thresholdTime = now;
      if (autoDeleteMode === "1") thresholdTime = now - ms("1d");
      else if (autoDeleteMode === "3") thresholdTime = now - ms("3d");
      else if (autoDeleteMode === "7") thresholdTime = now - ms("7d");
      else if (autoDeleteMode === "30") thresholdTime = now - ms("30d");
      try {
        await db.messages.where("timestamp").below(thresholdTime).delete();
      } catch (_) {}
    };
    sweepOldMessages();
  }, [autoDeleteMode]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (autoDeleteMode === "close") db.messages.clear();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [autoDeleteMode]);

  useEffect(() => {
    if (!activeChat || !isWebRTCConnected) return;
    if (!unreadCount[activeChat] || unreadCount[activeChat] === 0) return;
    sendMarkAsRead(activeChat);
    db.messages
      .filter(
        (msg) =>
          msg.ownerAddress === address?.toLowerCase() &&
          msg.chatId === activeChat.toLowerCase() &&
          !msg.isMine &&
          msg.status !== "read",
      )
      .modify({ status: "read" });
  }, [activeChat, isWebRTCConnected, sendMarkAsRead, unreadCount, address]);

  return {
    messages,
    unreadCount,
    unreadTotal: Object.values(unreadCount).reduce((a, b) => a + b, 0),
  };
};
