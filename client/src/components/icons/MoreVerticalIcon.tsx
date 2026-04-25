/**
 * Renders the specific icon.
 * @param {{ className?: string }} props - Component props
 * @returns {React.JSX.Element}
 */
export const MoreVerticalIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <circle cx="10" cy="4" r="1.5" />
    <circle cx="10" cy="10" r="1.5" />
    <circle cx="10" cy="16" r="1.5" />
  </svg>
);
