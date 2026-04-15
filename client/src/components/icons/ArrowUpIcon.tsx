/**
 * Renders the ArrowUpIcon icon.
 * @param {{ className?: string }} props - Component props
 * @returns {JSX.Element}
 */
export const ArrowUpIcon = ({ className }: { className?: string }) => (
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
      d="M5 10l7-7m0 0l7 7m-7-7v18"
    />
  </svg>
);
