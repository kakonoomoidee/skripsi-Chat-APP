/**
 * Renders the specific icon.
 * @param {{ className?: string }} props - Component props
 * @returns {JSX.Element}
 */
export const ArchiveIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 7.5h18M5.25 7.5l.84 10.08A2.25 2.25 0 008.333 19.5h7.334a2.25 2.25 0 002.243-1.92l.84-10.08M9.75 11.25h4.5"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 7.5V6a1.5 1.5 0 011.5-1.5h3A1.5 1.5 0 0115 6v1.5"
    />
  </svg>
);
