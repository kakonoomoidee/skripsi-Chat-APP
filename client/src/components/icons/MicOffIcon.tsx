import React from "react";

/**
 * Renders a muted microphone icon.
 *
 * @param {object} props - The component props.
 * @param {string} [props.className] - Optional CSS classes.
 * @returns {React.JSX.Element} The SVG element.
 */
export const MicOffIcon = ({
  className,
}: {
  className?: string;
}): React.JSX.Element => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
    />
    <line x1="4" y1="4" x2="20" y2="20" strokeWidth={2} strokeLinecap="round" />
  </svg>
);
