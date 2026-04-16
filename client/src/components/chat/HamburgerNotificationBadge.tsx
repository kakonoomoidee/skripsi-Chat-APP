import React from "react";

/**
 * Interface defining the properties for the HamburgerNotificationBadge component.
 */
interface HamburgerNotificationBadgeProps {
  /** The total number of unread messages across all active sessions. */
  unreadTotal: number;
}

/**
 * Renders a glass-styled notification badge for the global hamburger menu.
 * Displays the number of unread messages globally. If the count exceeds 99,
 * it displays "99+". The badge uses a semi-transparent, blurred aesthetic.
 *
 * @param {HamburgerNotificationBadgeProps} props - Component properties.
 * @returns {React.JSX.Element | null} The notification badge or null if no unread messages.
 */
export const HamburgerNotificationBadge = ({
  unreadTotal,
}: HamburgerNotificationBadgeProps): React.JSX.Element | null => {
  if (unreadTotal <= 0) return null;

  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-indigo-500/80 backdrop-blur-md text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-[0_4px_12px_rgba(99,102,241,0.5)] border border-indigo-400/30">
      {unreadTotal > 99 ? "99+" : unreadTotal}
    </span>
  );
};
