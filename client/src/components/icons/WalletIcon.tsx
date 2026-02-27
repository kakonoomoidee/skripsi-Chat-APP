/**
 * Renders the wallet/purse icon.
 * @param {{ className?: string }} props - Component props
 * @returns {JSX.Element}
 */
export const WalletIcon = ({ className }: { className?: string }) => (
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
      d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 9v3m-9 3h1.5"
    />
  </svg>
);
