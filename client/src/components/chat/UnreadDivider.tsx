import React from "react";

/**
 * A visual separator rendered directly above the first unread peer message
 * in the chat list. Provides a clear "Unread Messages" anchor so the user
 * immediately understands where new content begins.
 *
 * @returns {React.JSX.Element} The unread divider UI element.
 */
export const UnreadDivider = (): React.JSX.Element => (
  <div className="flex items-center gap-3 my-3 px-2 select-none">
    <div className="flex-1 h-px bg-indigo-500/25" />
    <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest whitespace-nowrap">
      Unread Messages
    </span>
    <div className="flex-1 h-px bg-indigo-500/25" />
  </div>
);
