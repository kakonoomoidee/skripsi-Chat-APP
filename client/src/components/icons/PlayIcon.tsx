/**
 * Renders the filled play arrow icon.
 * @param {{ className?: string }} props - Component props
 * @returns {JSX.Element}
 */
export const PlayIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);
