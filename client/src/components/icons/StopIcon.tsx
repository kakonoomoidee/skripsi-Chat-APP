/**
 * Renders the square stop recording icon.
 * @param {{ className?: string }} props - Component props
 * @returns {JSX.Element}
 */
export const StopIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <rect x="6" y="6" width="12" height="12" rx="2" strokeWidth={2} />
  </svg>
);
