import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Interface defining the props for the RelaySelector component.
 */
export interface RelaySelectorProps {
  activeRelay: string;
  defaultRelays: string[];
  changeRelay: (url: string) => void;
  addCustomRelay: (url: string) => void;
  size?: "sm" | "md"; // REFACTORED: Added size prop for layout flexibility
}

export default function RelaySelector({
  activeRelay,
  defaultRelays,
  changeRelay,
  addCustomRelay,
  size = "sm", // Default to 'sm' for Sidebar
}: RelaySelectorProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showInfo, setShowInfo] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [customRelayInput, setCustomRelayInput] = useState<string>("");

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowInfo(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddRelaySubmit = () => {
    if (customRelayInput.trim()) {
      addCustomRelay(customRelayInput.trim());
    }
    setIsModalOpen(false);
    setCustomRelayInput("");
  };

  // Dynamic styling based on size prop
  const triggerPadding =
    size === "md" ? "py-3 pl-4 pr-10 text-sm" : "py-2.5 pl-3 pr-8 text-xs";
  const buttonPadding =
    size === "md" ? "px-4 py-3 text-sm" : "px-3.5 py-2.5 text-xs";
  const listItemPadding =
    size === "md" ? "px-4 py-3 text-sm" : "px-4 py-2.5 text-xs";

  return (
    <>
      <div ref={containerRef}>
        <div className="flex items-center gap-1.5 mb-2 relative">
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
            Network Node
          </label>

          <button
            type="button"
            onClick={() => {
              setShowInfo(!showInfo);
              setIsOpen(false);
            }}
            className={`transition-colors focus:outline-none ${showInfo ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
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
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(!isOpen);
                setShowInfo(false);
              }}
              className={`w-full bg-zinc-900 border ${isOpen ? "border-indigo-500 ring-1 ring-indigo-500" : "border-zinc-800"} text-zinc-300 rounded-xl outline-none text-left transition-all shadow-sm flex items-center justify-between ${triggerPadding}`}
            >
              <span className="truncate">
                {activeRelay.replace("http://", "").replace("https://", "")}
              </span>
              <svg
                className={`w-4 h-4 text-zinc-500 transition-transform duration-200 absolute right-3 ${isOpen ? "rotate-180 text-indigo-400" : ""}`}
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
            </button>

            {isOpen && (
              <div className="absolute z-40 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <ul className="max-h-48 overflow-y-auto py-1 custom-scrollbar">
                  {defaultRelays.map((url) => (
                    <li key={url}>
                      <button
                        type="button"
                        onClick={() => {
                          changeRelay(url);
                          setIsOpen(false);
                        }}
                        className={`w-full text-left transition-colors ${listItemPadding} ${
                          activeRelay === url
                            ? "bg-indigo-600/10 text-indigo-400 font-medium"
                            : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                        }`}
                      >
                        {url.replace("http://", "").replace("https://", "")}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
                onChange={(e) => setCustomRelayInput(e.target.value)}
                placeholder="e.g. wss://my-relay.example.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all mb-5"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setCustomRelayInput("");
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
