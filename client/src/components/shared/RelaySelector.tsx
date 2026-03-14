import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { InfoIcon } from "@/components/icons";
import GlassDropdown from "@/components/shared/GlassDropdown";

/**
 * Interface defining the props for the RelaySelector component.
 */
export interface RelaySelectorProps {
  activeRelay: string;
  defaultRelays: string[];
  changeRelay: (url: string) => void;
  addCustomRelay: (url: string) => Promise<void>;
  size?: "sm" | "md";
}

/**
 * Component for selecting or adding a custom decentralized relay node.
 * Integrates GlassDropdown for node selection and an interactive modal for adding endpoints.
 *
 * @param {RelaySelectorProps} props - Component properties.
 * @returns {React.JSX.Element} The relay selector UI.
 */
export default function RelaySelector({
  activeRelay,
  defaultRelays,
  changeRelay,
  addCustomRelay,
  size = "sm",
}: RelaySelectorProps): React.JSX.Element {
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [customRelayInput, setCustomRelayInput] = useState<string>("");
  const [relayError, setRelayError] = useState<string>("");

  const infoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (infoRef.current && !infoRef.current.contains(event.target as Node)) {
        setShowInfo(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Processes the addition of a new custom relay URL.
   *
   * @returns {Promise<void>}
   */
  const handleAddRelaySubmit = async (): Promise<void> => {
    if (customRelayInput.trim()) {
      try {
        await addCustomRelay(customRelayInput.trim());
        setIsModalOpen(false);
        setCustomRelayInput("");
        setRelayError("");
      } catch (err) {
        setRelayError(
          err instanceof Error ? err.message : "Failed to add relay.",
        );
      }
    }
  };

  const buttonPadding =
    size === "md" ? "px-4 py-3 text-sm" : "px-3.5 py-2.5 text-xs";

  const dropdownOptions = defaultRelays.map((url) => ({
    value: url,
    label: url.replace("http://", "").replace("https://", ""),
  }));

  return (
    <>
      <div>
        <div className="flex items-center gap-1.5 mb-2 relative" ref={infoRef}>
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
            Network Node
          </label>

          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className={`transition-colors focus:outline-none ${showInfo ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            <InfoIcon className="w-3.5 h-3.5" />
          </button>

          {showInfo && (
            <div className="absolute left-0 top-6 z-50 w-64 p-3 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl text-xs text-zinc-300 leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-150">
              A <strong>Relay Node</strong> helps discover peers and exchange
              initial handshakes. It does <strong>NOT</strong> store, read, or
              route your end-to-end encrypted messages.
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <GlassDropdown
              value={activeRelay}
              options={dropdownOptions}
              onChange={changeRelay}
              placeholder="Select Relay Node"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className={`bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-indigo-400 hover:border-indigo-500/50 rounded-xl transition-all shadow-sm flex items-center justify-center font-bold ${buttonPadding}`}
            title="Add Custom Node"
          >
            +
          </button>
        </div>
      </div>

      {isModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-100 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <h3 className="text-lg font-bold text-zinc-100 mb-2">
                Add Custom Node
              </h3>
              <p className="text-xs text-zinc-400 mb-4">
                Enter the URL of your custom WSS or HTTP relay server to connect
                to an alternative network.
              </p>
              <input
                type="text"
                value={customRelayInput}
                onChange={(e) => {
                  setCustomRelayInput(e.target.value);
                  setRelayError("");
                }}
                placeholder="e.g. wss://my-relay.example.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all mb-2"
                autoFocus
              />
              {relayError && (
                <p className="text-xs text-red-400 mb-3">{relayError}</p>
              )}
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setCustomRelayInput("");
                    setRelayError("");
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRelaySubmit}
                  disabled={!customRelayInput.trim()}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                >
                  Connect
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
