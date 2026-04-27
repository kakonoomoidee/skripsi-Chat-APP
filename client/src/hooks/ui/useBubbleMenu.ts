import { useEffect, useRef, useState } from "react";
import { isEventOutsideElement, shouldCloseMenuOnEscape } from "@/utils/bubble";

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

  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (isEventOutsideElement(menuRef.current, event.target)) closeMenu();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (shouldCloseMenuOnEscape(event.key)) closeMenu();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showMenu]);

  return { showMenu, menuRef, closeMenu, toggleMenu };
};
