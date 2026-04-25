import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/utils/db";

/**
 * Props accepted by the PeerAvatar component.
 */
interface PeerAvatarProps {
  /**
   * Lowercase wallet address of the peer. Used as the Dexie primary key
   * to retrieve the cached avatar image.
   */
  peerAddress: string;

  /**
   * Fallback display name. The first character (uppercased) is shown when
   * no avatar exists in the local database.
   */
  displayName: string;

  /**
   * Optional Tailwind size classes for the outer container.
   * Defaults to `"w-9 h-9"` (36×36 px).
   */
  sizeClassName?: string;

  /**
   * Optional additional classes appended to the outer container div.
   */
  className?: string;
}

/**
 * Renders a persistent peer avatar that sources its image exclusively from the
 * local Dexie `contacts` table via a live query. Because the query is reactive,
 * the avatar updates immediately whenever a `PROFILE_SYNC` message is written
 * to the database — with no dependency on the peer's current connection state.
 *
 * Falls back to a coloured circle displaying the first letter of `displayName`
 * when no avatar record is present.
 *
 * @param {PeerAvatarProps} props - Component props.
 * @returns {React.JSX.Element} The rendered avatar element.
 */
export const PeerAvatar = ({
  peerAddress,
  displayName,
  sizeClassName = "w-9 h-9",
  className = "",
}: PeerAvatarProps): React.JSX.Element => {
  const contact = useLiveQuery(
    () => db.contacts.get(peerAddress.toLowerCase()),
    [peerAddress],
  );

  return (
    <div
      className={`${sizeClassName} rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 font-bold shrink-0 overflow-hidden ${className}`}
    >
      {contact?.avatar ? (
        <img
          src={contact.avatar}
          alt={displayName}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{displayName.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
};
