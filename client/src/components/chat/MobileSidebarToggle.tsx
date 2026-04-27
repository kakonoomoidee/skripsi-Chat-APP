import { MenuIcon } from "@/components/icons";
import { GlassBadge } from "@/components/ui";

export interface MobileSidebarToggleProps {
  unreadTotal: number;
  pendingRequestsTotal: number;
  onOpen: () => void;
}

/**
 * Renders the mobile-only sidebar toggle with unread and request counters.
 *
 * @param {MobileSidebarToggleProps} props - Toggle props.
 * @returns {React.JSX.Element} Sidebar toggle button.
 */
export const MobileSidebarToggle = ({
  unreadTotal,
  pendingRequestsTotal,
  onOpen,
}: MobileSidebarToggleProps): React.JSX.Element => {
  return (
    <button
      onClick={onOpen}
      className="md:hidden relative p-2 mr-2 -ml-2 text-zinc-400 hover:text-zinc-200 transition-colors"
    >
      <MenuIcon className="w-6 h-6" />
      <GlassBadge
        count={unreadTotal}
        variant="chat"
        className="absolute -top-1 -right-1"
      />
      <GlassBadge
        count={pendingRequestsTotal}
        variant="request"
        className="absolute -bottom-1 -right-1"
      />
    </button>
  );
};
