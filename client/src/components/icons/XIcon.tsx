import React from "react";

/**
 * Renders an X (Close/Decline) icon.
 * @param {object} props - The component props.
 * @param {string} [props.className] - Optional CSS classes.
 * @returns {React.JSX.Element} The SVG element.
 */
export const XIcon = ({
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
      strokeWidth={2.5}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);
