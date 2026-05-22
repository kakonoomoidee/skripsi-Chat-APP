import { Link } from "react-router-dom";
import { useState } from "react";
import ECCSection from "./ECCSection";
import ECDHSection from "./ECDHSection";
import WebRTCSection from "./WebRTCSection";
import BlockchainSection from "./BlockchainSection";

type TabId = "ecc" | "ecdh" | "webrtc" | "blockchain";

const TAB_CONFIG: { id: TabId; label: string }[] = [
  { id: "ecc", label: "ECC" },
  { id: "ecdh", label: "ECDH + AES" },
  { id: "webrtc", label: "WebRTC" },
  { id: "blockchain", label: "Blockchain" },
];

const TAB_ACCENT: Record<TabId, string> = {
  ecc: "text-indigo-400",
  ecdh: "text-cyan-400",
  webrtc: "text-purple-400",
  blockchain: "text-emerald-400",
};

/**
 * How It Works page - Interactive educational showcase of the four core technologies.
 * @returns {JSX.Element}
 */
export default function HowItWorks() {
  const [activeTab, setActiveTab] = useState<TabId>("ecc");

  return (
    <div className="bg-[#0c0a09] min-h-screen text-[#f5f5f4] flex flex-col font-sans selection:bg-indigo-500/30">
      <header className="px-6 py-4 border-b border-zinc-800/80 flex justify-between items-center bg-[#0c0a09]/80 backdrop-blur-md sticky top-0 z-50">
        <Link
          to="/landing"
          className="text-xl font-bold tracking-tight flex items-center gap-3"
        >
          <img
            src="/logo.png"
            alt="SecureP2P Logo"
            className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(79,70,229,0.8)]"
          />
          <span>
            Secure<span className="text-indigo-400">P2P</span>
          </span>
        </Link>
        <Link
          to="/landing"
          className="text-sm text-zinc-400 hover:text-indigo-400 transition-colors font-medium"
        >
          Back to Home
        </Link>
      </header>

      <section className="pt-16 pb-8 px-6 text-center">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3">
          How It Works
        </h1>
        <p className="text-zinc-400 text-base md:text-lg max-w-2xl mx-auto">
          Explore the cryptographic engine and peer-to-peer infrastructure that
          powers SecureP2P through interactive simulations.
        </p>
      </section>

      <nav className="px-6 border-b border-zinc-800/80 sticky top-[57px] z-40 bg-[#0c0a09]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex gap-1 overflow-x-auto">
          {TAB_CONFIG.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                id={`tab-${tab.id}`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-all duration-300 border-b-2 ${
                  isActive
                    ? `${TAB_ACCENT[tab.id]} border-current`
                    : "text-zinc-500 border-transparent hover:text-zinc-300"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="flex-1 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          {activeTab === "ecc" && <ECCSection />}
          {activeTab === "ecdh" && <ECDHSection />}
          {activeTab === "webrtc" && <WebRTCSection />}
          {activeTab === "blockchain" && <BlockchainSection />}
        </div>
      </main>
    </div>
  );
}
