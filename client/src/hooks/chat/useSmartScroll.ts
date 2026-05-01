import {
  useEffect,
  useRef,
  useCallback,
  useState,
  type RefObject,
} from "react";
import type { Message } from "@/utils/storage/db";

/**
 * @module useSmartScroll
 * Provides context-aware scroll management for a chat message list.
 * Uses a pre-computed `entryPointId` to anchor the view on initial load,
 * locking the `scrollSettledRef` gate during the animation so that the
 * IntersectionObserver in `useMessageVisibility` cannot fire prematurely.
 *
 * The hook maintains two independent boolean refs:
 * - `activeChatTrackerRef` — tracks which chat session the initial scroll was
 *   performed for, so the logic resets correctly when the user switches chats.
 * - `initialScrollDone` — a simple boolean that gates all subsequent
 *   auto-scroll-to-bottom calls, ensuring they cannot fire before the entry
 *   point scroll has completed.
 */

const AT_BOTTOM_THRESHOLD_PX = 80;
const SCROLL_SETTLE_DELAY_MS = 400;

/**
 * Return value exposed by {@link useSmartScroll}.
 */
export interface UseSmartScrollReturn {
  isAtBottom: boolean;
  scrollToBottom: () => void;
}

/**
 * Manages automatic and manual scrolling for a chat message list container.
 *
 * On chat mount it performs a single instant scroll to the element identified
 * by `entryPointId`, sets `scrollSettledRef.current` to `false` for the settle
 * window to suppress the IntersectionObserver, and marks `initialScrollDone`
 * as `true`. Only after this flag is set will subsequent message arrivals
 * trigger an auto-scroll to the bottom — and only when the user is already
 * near the bottom, or the latest message belongs to the current user.
 *
 * @param {RefObject<HTMLDivElement | null>} scrollContainerRef - Ref attached to the scrollable container element.
 * @param {RefObject<HTMLDivElement | null>} bottomRef - Ref attached to the sentinel element at the end of the list.
 * @param {Message[]} messages - The current ordered list of decrypted messages.
 * @param {string | null} activeChat - The peer address of the currently open chat session.
 * @param {number | null} entryPointId - Pre-computed ID of the first unread peer message, or the last message ID.
 * @param {RefObject<boolean>} scrollSettledRef - Shared mutable ref gating IntersectionObserver callbacks.
 * @returns {UseSmartScrollReturn} Whether the user is at the bottom and an imperative scroll function.
 */
export const useSmartScroll = (
  scrollContainerRef: RefObject<HTMLDivElement | null>,
  bottomRef: RefObject<HTMLDivElement | null>,
  messages: Message[],
  activeChat: string | null,
  entryPointId: number | null,
  scrollSettledRef: RefObject<boolean>,
): UseSmartScrollReturn => {
  const activeChatTrackerRef = useRef<string | null>(null);
  const initialScrollDone = useRef<boolean>(false);
  const prevLengthRef = useRef<number>(0);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);

  const scrollToBottom = useCallback((): void => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [bottomRef]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = (): void => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      setIsAtBottom(distanceFromBottom <= AT_BOTTOM_THRESHOLD_PX);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [scrollContainerRef]);

  useEffect(() => {
    if (!activeChat || !messages.length) return;

    if (activeChatTrackerRef.current !== activeChat) {
      activeChatTrackerRef.current = activeChat;
      initialScrollDone.current = false;
      prevLengthRef.current = 0;
      setIsAtBottom(true);

      if (settleTimerRef.current !== null) {
        clearTimeout(settleTimerRef.current);
      }

      scrollSettledRef.current = false;

      requestAnimationFrame(() => {
        const container = scrollContainerRef.current;
        const targetEl =
          entryPointId !== null
            ? document.getElementById(`msg-${entryPointId}`)
            : null;

        const shouldAnchorToEntry =
          targetEl !== null &&
          container !== null &&
          container.scrollHeight - targetEl.offsetTop > container.clientHeight;

        if (shouldAnchorToEntry && targetEl !== null) {
          targetEl.scrollIntoView({ behavior: "instant", block: "center" });
        } else {
          bottomRef.current?.scrollIntoView({ behavior: "instant" });
        }

        prevLengthRef.current = messages.length;
        initialScrollDone.current = true;

        settleTimerRef.current = setTimeout(() => {
          scrollSettledRef.current = true;
          settleTimerRef.current = null;
        }, SCROLL_SETTLE_DELAY_MS);
      });

      return;
    }

    if (!initialScrollDone.current) return;

    if (messages.length <= prevLengthRef.current) {
      prevLengthRef.current = messages.length;
      return;
    }

    const newCount = messages.length - prevLengthRef.current;
    prevLengthRef.current = messages.length;

    const latestNew = messages[messages.length - 1];
    if (!latestNew) return;

    if (latestNew.isMine || (newCount > 1 && isAtBottom)) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeChat, entryPointId, bottomRef, scrollSettledRef, isAtBottom]);

  useEffect(() => {
    return () => {
      if (settleTimerRef.current !== null) {
        clearTimeout(settleTimerRef.current);
      }
    };
  }, []);

  return { isAtBottom, scrollToBottom };
};
