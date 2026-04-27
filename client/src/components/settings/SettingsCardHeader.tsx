import React from "react";

export interface SettingsCardHeaderProps {
  icon: React.ReactNode;
  label: string;
}

/**
 * Renders a standardized settings section header with icon and label.
 *
 * @param {SettingsCardHeaderProps} props - Header props.
 * @returns {React.JSX.Element} Settings card header.
 */
export const SettingsCardHeader = ({
  icon,
  label,
}: SettingsCardHeaderProps): React.JSX.Element => (
  <div className="flex items-center gap-2.5 px-5 py-4 border-b border-zinc-800/60">
    <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <h3 className="text-[11px] font-bold text-zinc-300 uppercase tracking-[0.12em]">
      {label}
    </h3>
  </div>
);
