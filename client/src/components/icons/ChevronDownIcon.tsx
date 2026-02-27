/**
 * Renders the chevron down arrow icon.
 * @param {{ className?: string }} props - Component props
 * @returns {JSX.Element}
 */
export const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
    />
  </svg>
);
