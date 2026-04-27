import { useEffect, useRef, useState } from "react";
import { isEventOutsideElement, shouldCloseMenuOnEscape } from "@/utils/bubble";

/**
 * Manages open/close behavior for dismissable popovers with outside click and escape handling.
 *
 * @returns {{
 *   isOpen: boolean;
 *   containerRef: React.RefObject<HTMLDivElement | null>;
 *   open: () => void;
 *   close: () => void;
 *   toggle: () => void;
 * }} Popover state and helpers.
 */
export const useDismissablePopover = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((current) => !current);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (isEventOutsideElement(containerRef.current, event.target)) close();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (shouldCloseMenuOnEscape(event.key)) close();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return { isOpen, containerRef, open, close, toggle };
};
