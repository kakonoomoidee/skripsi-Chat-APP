import { ChangeEvent } from "react";

/**
 * Interface defining the props for the RelaySelector component.
 */
export interface RelaySelectorProps {
  activeRelay: string;
  defaultRelays: string[];
  changeRelay: (url: string) => void;
  addCustomRelay: (url: string) => void;
}

/**
 * 1. Reusable Network Node Selector
 * Renders a styled dropdown to select a connection relay or add a custom one.
 * @param {RelaySelectorProps} props - Relay states and modifier functions
 * @returns {JSX.Element}
 */
export default function RelaySelector({
  activeRelay,
  defaultRelays,
  changeRelay,
  addCustomRelay,
}: RelaySelectorProps) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
        Network Node
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1 group">
          <select
            value={activeRelay}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              changeRelay(e.target.value)
            }
            className="w-full appearance-none bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-xl pl-3 pr-8 py-2.5 outline-none cursor-pointer focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
          >
            {defaultRelays.map((url: string) => (
              <option key={url} value={url}>
                {url.replace("http://", "").replace("https://", "")}
              </option>
            ))}
          </select>
          {/* Custom Dropdown Arrow */}
          <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-zinc-600 group-focus-within:text-indigo-400 transition-colors">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const u = prompt("Enter Custom WSS/HTTP Relay URL:");
            if (u) addCustomRelay(u);
          }}
          className="px-3.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-indigo-400 hover:border-indigo-500/50 rounded-xl transition-all shadow-sm flex items-center justify-center font-bold"
          title="Add Custom Node"
        >
          +
        </button>
      </div>
    </div>
  );
}
