import { useRef, useState } from "react";
import { useDismissableLayer } from "@/hooks/ui/useDismissableLayer";

/**
 * Manages contextual bubble menu open/close behavior and outside-dismiss events.
 *
 * @returns {{
 *   showMenu: boolean;
 *   menuRef: React.RefObject<HTMLDivElement | null>;
 *   closeMenu: () => void;
 *   toggleMenu: () => void;
 * }} Menu state and handlers.
 */
export const useBubbleMenu = () => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => setShowMenu(false);
  const toggleMenu = () => setShowMenu((current) => !current);

  useDismissableLayer({
    enabled: showMenu,
    ref: menuRef,
    onDismiss: closeMenu,
  });

  return { showMenu, menuRef, closeMenu, toggleMenu };
};
