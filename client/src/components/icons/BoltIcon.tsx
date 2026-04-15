/**
 * Renders the BoltIcon icon.
 * @param {{ className?: string }} props - Component props
 * @returns {JSX.Element}
 */
export const BoltIcon = ({ className }: { className?: string }) => (
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
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  </svg>
);
