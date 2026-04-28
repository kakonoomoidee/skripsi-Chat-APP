import { useRef, useState } from "react";
import { useDismissableLayer } from "@/hooks/ui/useDismissableLayer";

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

  useDismissableLayer({
    enabled: isOpen,
    ref: containerRef,
    onDismiss: close,
    pointerEvents: ["mousedown", "touchstart"],
  });

  return { isOpen, containerRef, open, close, toggle };
};
