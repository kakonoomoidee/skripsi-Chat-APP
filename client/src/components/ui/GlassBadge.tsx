import React from "react";

const BADGE_VARIANT_STYLES: Record<"chat" | "request", string> = {
  chat: "bg-indigo-500/80 shadow-[0_4px_12px_rgba(99,102,241,0.5)] border-indigo-400/30",
  request:
    "bg-orange-500/80 shadow-[0_4px_12px_rgba(249,115,22,0.5)] border-orange-400/30",
};

/**
 * Interface defining the properties for the GlassBadge component.
 */
export interface GlassBadgeProps {
  /** The numeric count to display inside the badge. */
  count: number;
  /** The style variant representing the context of the notification. */
  variant: "chat" | "request";
  /** Optional custom Tailwind positioning or structural classes. */
  className?: string;
}

/**
 * A highly reusable, dynamic glass-effect badge for notification counters.
 * Limits shown numbers to "99+" and completely hides itself if the count <= 0.
 *
 * @param {GlassBadgeProps} props - Component properties.
 * @returns {React.JSX.Element | null} The badge UI or null if empty.
 */
export const GlassBadge = ({
  count,
  variant,
  className = "",
}: GlassBadgeProps): React.JSX.Element | null => {
  if (!Number.isFinite(count) || count <= 0) return null;

  return (
    <span
      className={`min-w-4.5 h-4.5 backdrop-blur-md text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border ${BADGE_VARIANT_STYLES[variant]} ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
};
