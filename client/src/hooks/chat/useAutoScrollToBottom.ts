import { useCallback, type RefObject } from "react";

/**
 * Returns a stable callback that smoothly scrolls the given ref into view.
 * The hook performs no automatic scrolling on mount or on dependency changes.
 *
 * @param {RefObject<HTMLElement | null>} targetRef - Ref attached to the bottom sentinel element.
 * @returns {() => void} Imperative scroll-to-bottom function.
 */
export const useAutoScrollToBottom = (
  targetRef: RefObject<HTMLElement | null>,
): () => void => {
  return useCallback((): void => {
    targetRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [targetRef]);
};
