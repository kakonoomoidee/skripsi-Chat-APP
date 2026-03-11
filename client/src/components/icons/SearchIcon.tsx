import React from "react";

/**
 * Renders a magnifying glass search icon.
 * @param {object} props - Component props.
 * @param {string} [props.className] - Optional CSS classes.
 * @returns {React.JSX.Element}
 */
export const SearchIcon = ({
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
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);
