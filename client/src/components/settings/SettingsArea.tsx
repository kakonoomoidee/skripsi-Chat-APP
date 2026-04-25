import React from "react";
import { useChatContext } from "@/context/ChatContext";
import ProfileSettings from "@/components/settings/ProfileSettings";
import Web3Wallet from "@/components/settings/Web3Wallet";
import DataSecurity from "@/components/settings/DataSecurity";
import NetworkNode from "@/components/settings/NetworkNode";
import BlockedUsers from "@/components/settings/BlockedUsers";
import RelaySelector from "@/components/ui/RelaySelector";
import {
  ShieldCheckIcon,
  XIcon,
  LockSessionIcon,
  DatabaseIcon,
  ServerIcon,
  GlobeIcon,
} from "@/components/icons";

/**
 * Renders a consistent card section header with an icon and label.
 *
 * @param {{ icon: React.ReactNode; label: string }} props - Component props.
 * @returns {React.JSX.Element} The Card Header component.
 */
const CardHeader = ({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}): React.JSX.Element => (
  <div className="flex items-center gap-2.5 px-5 py-4 border-b border-zinc-800/60">
    <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <h3 className="text-[11px] font-bold text-zinc-300 uppercase tracking-[0.12em]">
      {label}
    </h3>
  </div>
);

/**
 * Full-panel Settings view.
 * Acts as a clean parent wrapper for modularized settings components.
 *
 * @returns {React.JSX.Element} The Settings Area component.
 */
export default function SettingsArea(): React.JSX.Element {
  const {
    isConnected,
    activeRelay,
    defaultRelays,
    changeRelay,
    addCustomRelay,
    setActiveAreaView,
    logout,
  } = useChatContext();

  return (
    <div className="flex flex-col h-full bg-zinc-950 w-full overflow-hidden">
      <div className="h-14 shrink-0 border-b border-zinc-800/60 flex items-center px-5 bg-zinc-950/95 backdrop-blur-sm justify-between z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveAreaView("chat")}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-all"
          >
            <XIcon className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-zinc-400 tracking-wide">
            Settings
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-400" : "bg-red-500"}`}
          />
          <span className="text-[10px] text-zinc-600">
            {isConnected ? "Relay Online" : "Disconnected"}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-5 space-y-4">
          <ProfileSettings />

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 bg-zinc-900/60 border border-zinc-800/70 rounded-2xl overflow-visible">
              <CardHeader
                label="Web3 Wallet Configuration"
                icon={<DatabaseIcon className="w-3.5 h-3.5 text-indigo-400" />}
              />
              <div className="px-5 py-4">
                <Web3Wallet />
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-4 relative z-50">
              <div className="bg-zinc-900/60 border border-zinc-800/70 rounded-2xl overflow-visible relative z-20">
                <CardHeader
                  label="Data Management"
                  icon={<ServerIcon className="w-3.5 h-3.5 text-indigo-400" />}
                />
                <div className="p-4 space-y-4">
                  <DataSecurity />
                </div>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800/70 rounded-2xl overflow-visible relative z-10">
                <CardHeader
                  label="Network Node"
                  icon={<GlobeIcon className="w-3.5 h-3.5 text-indigo-400" />}
                />
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="font-mono text-xs text-zinc-300 truncate">
                    {activeRelay}
                  </span>
                  <span
                    className={`shrink-0 ml-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                      isConnected
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : "text-red-400 bg-red-500/10 border-red-500/20"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-400" : "bg-red-400"}`}
                    />
                    {isConnected ? "Active" : "Offline"}
                  </span>
                </div>
                <div className="px-4 pb-4 overflow-visible relative z-[50]">
                  <NetworkNode
                    nodeSelector={
                      <RelaySelector
                        activeRelay={activeRelay}
                        defaultRelays={defaultRelays}
                        changeRelay={changeRelay}
                        addCustomRelay={addCustomRelay}
                      />
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">
            <div className="bg-zinc-900/60 border border-zinc-800/70 rounded-2xl overflow-hidden">
              <BlockedUsers />
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/70 rounded-2xl overflow-hidden">
              <CardHeader
                label="Security & Privacy"
                icon={<ShieldCheckIcon className="w-3.5 h-3.5 text-red-400" />}
              />
              <div className="px-5 py-4 space-y-4">
                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs font-semibold text-zinc-400">
                    Encryption Layer
                  </p>
                  <span className="font-mono text-xs font-bold text-indigo-400">
                    AES-256-GCM
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 py-2.5 rounded-xl transition-all"
                >
                  <LockSessionIcon className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
