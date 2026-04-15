/**
 * Renders the ArrowDownIcon icon.
 * @param {{ className?: string }} props - Component props
 * @returns {JSX.Element}
 */
export const ArrowDownIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      d="M19 14l-7 7m0 0l-7-7m7 7V3"
    />
  </svg>
);
