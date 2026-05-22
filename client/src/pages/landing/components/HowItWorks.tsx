import { Link } from "react-router-dom";
import { useState } from "react";
import ECCSection from "./ECCSection";
import ECDHSection from "./ECDHSection";
import WebRTCSection from "./WebRTCSection";
import BlockchainSection from "./BlockchainSection";

type TabId = "ecc" | "ecdh" | "webrtc" | "blockchain";

const TAB_CONFIG: { id: TabId; label: string; number: string }[] = [
  { id: "ecc", label: "Elliptic Curve", number: "01" },
  { id: "ecdh", label: "Key Exchange", number: "02" },
  { id: "webrtc", label: "P2P Tunnel", number: "03" },
  { id: "blockchain", label: "Ledger", number: "04" },
];

const TAB_ACCENT: Record<TabId, string> = {
  ecc: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
  ecdh: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  webrtc: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  blockchain: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
};

/**
 * How It Works page - Modern Web3 Design
 * @returns {JSX.Element}
 */
export default function HowItWorks() {
  const [activeTab, setActiveTab] = useState<TabId>("ecc");

  return (
    <div className="bg-black min-h-screen text-[#f5f5f4] flex flex-col font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] opacity-10 pointer-events-none bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-900 via-transparent to-transparent" />

      <header className="px-8 py-5 flex justify-between items-center bg-black/40 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-50">
        <Link
          to="/landing"
          className="text-xl font-bold tracking-tight flex items-center gap-3 group"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500 blur-md opacity-50 group-hover:opacity-80 transition-opacity" />
            <img
              src="/logo.png"
              alt="SecureP2P Logo"
              className="w-8 h-8 object-contain relative z-10"
            />
          </div>
          <span className="text-white drop-shadow-md">
            Secure<span className="text-indigo-400">P2P</span>
          </span>
        </Link>
        <Link
          to="/landing"
          className="text-xs uppercase tracking-[0.2em] text-zinc-400 hover:text-indigo-300 transition-colors font-semibold"
        >
          Return to Hub
        </Link>
      </header>

      <section className="pt-20 pb-12 px-6 text-center relative z-10">
        <div className="inline-block mb-4 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
          <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-400 font-semibold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Protocol Architecture
          </span>
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-6 drop-shadow-2xl">
          The <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500">Engine</span> Inside
        </h1>
        <p className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto font-light leading-relaxed">
          Interactive simulations of the cryptographic primitives and decentralized
          infrastructure powering our zero-trust secure messaging protocol.
        </p>
      </section>

      <nav className="px-6 mb-12 relative z-20">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-nowrap md:flex-wrap gap-3 overflow-x-auto pb-4 md:pb-0 justify-start md:justify-center">
            {TAB_CONFIG.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  id={`tab-${tab.id}`}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-5 py-3 rounded-2xl transition-all duration-500 whitespace-nowrap border ${
                    isActive
                      ? `${TAB_ACCENT[tab.id]} shadow-[0_0_20px_rgba(255,255,255,0.05)] scale-105`
                      : "bg-white/[0.02] border-white/5 text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
                  } backdrop-blur-xl`}
                >
                  <span className={`text-[10px] font-mono font-bold opacity-60 ${isActive ? "text-current" : "text-zinc-600"}`}>
                    {tab.number}
                  </span>
                  <span className="text-sm font-semibold tracking-wide">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="flex-1 px-6 pb-24 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 md:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
            
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both">
              {activeTab === "ecc" && <ECCSection />}
              {activeTab === "ecdh" && <ECDHSection />}
              {activeTab === "webrtc" && <WebRTCSection />}
              {activeTab === "blockchain" && <BlockchainSection />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
