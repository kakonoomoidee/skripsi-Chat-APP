import React from "react";
import { MessageStatus } from "@/utils/db";

/**
 * Interface defining the properties for the MessageStatusIcon component.
 */
interface MessageStatusIconProps {
  /** The delivery status of the message to be represented visually. */
  status: MessageStatus;
}

/**
 * Renders an inline SVG icon representing the delivery status of a sent message.
 *
 * - `pending`   → A clock icon in muted gray, indicating the message is queued locally.
 * - `delivered` → Double checkmarks in gray, indicating the peer received the message.
 * - `read`      → Double checkmarks in blue/indigo, indicating the peer has seen the message.
 *
 * @param {MessageStatusIconProps} props - Component properties.
 * @returns {React.JSX.Element} The status icon SVG element.
 */
export const MessageStatusIcon = ({
  status,
}: MessageStatusIconProps): React.JSX.Element => {
  if (status === "pending") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="none"
        className="w-3 h-3 inline-block ml-1 mb-0.5 text-indigo-300/50"
        aria-label="Pending"
      >
        <circle
          cx="8"
          cy="8"
          r="6.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M8 5v3.5l2 1.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (status === "read") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 12"
        fill="none"
        className="w-4 h-3 inline-block ml-1 mb-0.5 text-sky-400"
        aria-label="Read"
      >
        <path
          d="M1 6l4 4L13 2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7 6l4 4L19 2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 12"
      fill="none"
      className="w-4 h-3 inline-block ml-1 mb-0.5 text-indigo-200/60"
      aria-label="Delivered"
    >
      <path
        d="M1 6l4 4L13 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 6l4 4L19 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
