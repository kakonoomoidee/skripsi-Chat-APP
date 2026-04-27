import { useEffect } from "react";

/**
 * Scrolls the target element into view whenever a dependency value changes.
 *
 * @param {React.RefObject<HTMLElement | null>} targetRef - End-of-list anchor ref.
 * @param {unknown} dependency - Value that triggers scrolling updates.
 * @returns {void}
 */
export const useAutoScrollToBottom = (
  targetRef: React.RefObject<HTMLElement | null>,
  dependency: unknown,
): void => {
  useEffect(() => {
    const targetElement = targetRef.current;
    if (!targetElement) {
      return;
    }

    targetElement.scrollIntoView({ behavior: "smooth" });
  }, [targetRef, dependency]);
};
