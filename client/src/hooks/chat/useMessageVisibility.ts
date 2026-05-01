import { useEffect, useRef, type RefObject } from "react";
import { db } from "@/utils/storage/db";
import type { Message } from "@/utils/storage/db";
import { useChatContext } from "@/context/ChatContext";

/**
 * @module useMessageVisibility
 * Provides a custom React hook that uses the native IntersectionObserver API
 * to trigger read-receipt logic exactly once per message when it enters the
 * user's viewport, replacing the previous eager bulk-read approach.
 */

/**
 * Observes a message DOM element and marks it as read when it enters the
 * viewport. The observer callback is suppressed while `scrollSettledRef` is
 * false (i.e. during the initial programmatic scroll animation) to prevent
 * the race condition where auto-scrolling triggers premature read receipts.
 * Once allowed, the Dexie record is updated and the WebRTC signal is sent
 * only when the data channel is open. The observer disconnects immediately
 * after the first qualifying intersection.
 *
 * @param {RefObject<HTMLElement | null>} elementRef - Ref attached to the message wrapper element.
 * @param {Message} msg - The message entity whose viewport visibility is being tracked.
 * @returns {void}
 */
export const useMessageVisibility = (
  elementRef: RefObject<HTMLElement | null>,
  msg: Message,
): void => {
  const { sendMarkAsRead, activeChat, isWebRTCConnected, scrollSettledRef } =
    useChatContext();
  const hasMarkedRef = useRef<boolean>(false);

  useEffect(() => {
    if (hasMarkedRef.current) return;
    if (msg.isMine || msg.status === "read") return;
    if (!msg.id || !activeChat) return;

    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        const entry = entries[0];
        if (!entry.isIntersecting) return;
        if (!scrollSettledRef.current) return;

        hasMarkedRef.current = true;
        observer.unobserve(entry.target);

        db.messages.update(msg.id as number, { status: "read" });

        if (isWebRTCConnected) {
          sendMarkAsRead(activeChat);
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [
    msg.id,
    msg.isMine,
    msg.status,
    activeChat,
    isWebRTCConnected,
    sendMarkAsRead,
    scrollSettledRef,
    elementRef,
  ]);
};
