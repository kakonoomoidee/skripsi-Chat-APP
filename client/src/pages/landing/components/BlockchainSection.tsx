import { useState, useEffect, useRef } from "react";

/**
 * Produces a deterministic 64-character hexadecimal hash string from the given input.
 * @param {string} input
 * @returns {string}
 */
function simulateHash(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  let result =
    (h2 >>> 0).toString(16).padStart(8, "0") +
    (h1 >>> 0).toString(16).padStart(8, "0");
  for (let j = 0; result.length < 64; j++) {
    h1 = Math.imul(h1 ^ ((j + 1) * 0x27d4eb2d), 0x1b873593);
    result += (h1 >>> 0).toString(16).padStart(8, "0");
  }
  return result.substring(0, 64);
}

interface ChainBlock {
  index: number;
  timestamp: string;
  data: string;
  nonce: number;
  hash: string;
  prevHash: string;
}

type MiningPhase =
  | "idle"
  | "creating"
  | "signing"
  | "mining"
  | "confirmed"
  | "appended";

const GENESIS_BLOCK: ChainBlock = {
  index: 0,
  timestamp: "2024-01-01",
  data: "Genesis Block",
  nonce: 0,
  hash: "0000a1b2c3d4e5f6",
  prevHash: "0000000000000000",
};

/**
 * Interactive blockchain simulation demonstrating transaction creation.
 * @returns {JSX.Element}
 */
export default function BlockchainSection() {
  const [username, setUsername] = useState("");
  const [phase, setPhase] = useState<MiningPhase>("idle");
  const [displayNonce, setDisplayNonce] = useState(0);
  const [currentHash, setCurrentHash] = useState("");
  const [signature, setSignature] = useState("");
  const [chain, setChain] = useState<ChainBlock[]>([GENESIS_BLOCK]);
  const nonceRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const handleMine = () => {
    if (!username.trim() || (phase !== "idle" && phase !== "appended")) return;
    setPhase("creating");
    nonceRef.current = 0;
    setDisplayNonce(0);
    setCurrentHash("");
    setSignature("");
    timersRef.current = [];

    const t1 = setTimeout(() => {
      setPhase("signing");
      const sig = simulateHash(
        `REGISTER:${username}:${Date.now()}`,
      ).substring(0, 40);
      setSignature(sig);

      const t2 = setTimeout(() => {
        setPhase("mining");

        intervalRef.current = setInterval(() => {
          nonceRef.current += 1;
          const hashInput = `${chain.length}:${username}:${nonceRef.current}`;
          const hash = simulateHash(hashInput);
          setDisplayNonce(nonceRef.current);
          setCurrentHash(hash.substring(0, 16));

          if (nonceRef.current >= 28) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            const validHash = "0000" + hash.substring(4, 16);
            setCurrentHash(validHash);
            setPhase("confirmed");

            const t3 = setTimeout(() => {
              const newBlock: ChainBlock = {
                index: chain.length,
                timestamp: new Date().toISOString().split("T")[0],
                data: `REGISTER: ${username}`,
                nonce: nonceRef.current,
                hash: validHash,
                prevHash: chain[chain.length - 1].hash,
              };
              setChain((prev) => [...prev, newBlock]);
              setPhase("appended");
            }, 1200);
            timersRef.current.push(t3);
          }
        }, 70);
      }, 900);
      timersRef.current.push(t2);
    }, 900);
    timersRef.current.push(t1);
  };

  const handleReset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    timersRef.current.forEach(clearTimeout);
    setPhase("idle");
    setUsername("");
    setDisplayNonce(0);
    setCurrentHash("");
    setSignature("");
    setChain([GENESIS_BLOCK]);
  };

  const phaseSteps: { label: string; active: boolean; done: boolean }[] = [
    {
      label: "Create Tx",
      active: phase === "creating",
      done: phase !== "idle" && phase !== "creating",
    },
    {
      label: "Sign Payload",
      active: phase === "signing",
      done: ["mining", "confirmed", "appended"].includes(phase),
    },
    {
      label: "PoW Mining",
      active: phase === "mining",
      done: phase === "confirmed" || phase === "appended",
    },
    {
      label: "Consensus",
      active: phase === "confirmed",
      done: phase === "appended",
    },
  ];

  return (
    <div className="space-y-10">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h3 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          Distributed Registry
        </h3>
        <p className="text-zinc-400/80 text-sm md:text-base leading-relaxed font-light">
          Register your global identity. The transaction is signed locally, mined via
          Proof-of-Work to prevent spam, and permanently secured on the immutable
          public ledger.
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-full px-6 py-4 backdrop-blur-md">
          {phaseSteps.map((step, idx) => (
            <div key={step.label} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 shadow-inner ${
                    step.done
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                      : step.active
                        ? "bg-emerald-500/10 border-2 border-emerald-400 text-emerald-300 animate-[pulse_2s_infinite] shadow-[0_0_20px_rgba(16,185,129,0.6)]"
                        : "bg-black/50 text-zinc-600 border border-white/10"
                  }`}
                >
                  {step.done ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={`text-[10px] uppercase tracking-widest font-bold transition-colors hidden md:block ${
                    step.done
                      ? "text-emerald-500/80"
                      : step.active
                      ? "text-emerald-300 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]"
                      : "text-zinc-600"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < phaseSteps.length - 1 && (
                <div
                  className={`flex-1 h-px mx-4 transition-all duration-700 ${
                    step.done ? "bg-gradient-to-r from-emerald-500/50 to-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-white/5"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-5 flex flex-col gap-6">
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-7 flex-1 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]">
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-4 block flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Register Username
            </label>
            <input
              id="blockchain-username-input"
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))
              }
              placeholder="e.g. satoshi_nakamoto"
              maxLength={24}
              disabled={phase !== "idle" && phase !== "appended"}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-emerald-300 font-mono text-lg focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-700/50 shadow-inner disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-3">
            <button
              id="blockchain-mine-btn"
              onClick={handleMine}
              disabled={
                !username.trim() || (phase !== "idle" && phase !== "appended")
              }
              className="w-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 disabled:border-white/5 disabled:bg-white/[0.02] disabled:text-zinc-600 px-8 py-4 rounded-xl font-bold tracking-wide transition-all duration-300 hover:bg-emerald-500/20 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] disabled:shadow-none"
            >
              {phase === "mining" ? "COMPUTING HASH..." : "SIGN & MINE BLOCK"}
            </button>
            {phase === "appended" && (
              <button
                onClick={handleReset}
                className="w-full bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 text-zinc-400 px-6 py-4 rounded-xl font-medium transition-all"
              >
                Reset Ledger
              </button>
            )}
          </div>
        </div>

        <div className="md:col-span-7 flex flex-col gap-6">
          <div className="bg-[#050505] border border-white/5 rounded-3xl p-6 font-mono text-[13px] h-56 overflow-y-auto relative shadow-inner">
             {phase === "idle" ? (
               <div className="absolute inset-0 flex items-center justify-center opacity-30">
                 <span className="text-zinc-600">Awaiting transaction...</span>
               </div>
             ) : (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="bg-white/[0.02] p-3 rounded-lg border border-white/5">
                  <span className="text-zinc-600 mr-2">Tx Payload:</span>
                  <span className="text-amber-300/80 break-all">
                    {`{ action: "REGISTER", id: "${username}", from: "0x${simulateHash(username).substring(0, 8)}..." }`}
                  </span>
                </div>
                
                {signature && (
                  <div className="bg-white/[0.02] p-3 rounded-lg border border-white/5 animate-in slide-in-from-left-2 duration-300">
                    <span className="text-zinc-600 mr-2">Digital Sig:</span>
                    <span className="text-purple-400 break-all">
                      0x{signature.substring(0, 48)}...
                    </span>
                  </div>
                )}
                
                {(phase === "mining" || phase === "confirmed" || phase === "appended") && (
                  <div className="bg-emerald-500/5 p-4 rounded-lg border border-emerald-500/20 shadow-inner">
                    <div className="grid grid-cols-12 gap-2 mb-2">
                      <div className="col-span-3 text-zinc-500">Nonce</div>
                      <div className={`col-span-9 ${phase === "mining" ? "text-amber-400" : "text-emerald-400"}`}>
                        {displayNonce.toString().padStart(6, "0")}
                      </div>
                    </div>
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-3 text-zinc-500">SHA-256</div>
                      <div className="col-span-9 flex items-center gap-3">
                        <span className={currentHash.startsWith("0000") ? "text-emerald-400 font-bold" : "text-zinc-400"}>
                          {currentHash || "computing..."}
                        </span>
                        {currentHash.startsWith("0000") && (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded border border-emerald-500/30 tracking-widest">
                            TARGET MET
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 relative overflow-hidden">
            <h4 className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-zinc-600" />
              Live Chain State
            </h4>
            
            <div className="flex gap-4 overflow-x-auto pb-4">
              {chain.map((block, idx) => (
                <div
                  key={block.index}
                  className={`flex-shrink-0 w-64 bg-[#0a0a0a] border rounded-2xl p-5 text-xs font-mono transition-all duration-700 relative overflow-hidden ${
                    idx === chain.length - 1 && phase === "appended"
                      ? "border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)] animate-in slide-in-from-right-8 fade-in zoom-in-95"
                      : "border-white/10 opacity-70"
                  }`}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 blur-2xl rounded-full" />
                  <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3 relative z-10">
                    <span className="text-emerald-400 font-black tracking-widest">
                      BLOCK #{block.index.toString().padStart(3, "0")}
                    </span>
                    <span className="text-zinc-600 text-[10px]">{block.timestamp}</span>
                  </div>
                  <div className="space-y-2 text-[10px] relative z-10">
                    <div className="flex flex-col gap-1">
                      <span className="text-zinc-600 uppercase tracking-wider">Payload</span>
                      <span className="text-zinc-300 truncate">{block.data}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-zinc-600 uppercase tracking-wider">Hash</span>
                      <span className="text-emerald-400/80 truncate">{block.hash}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-zinc-600 uppercase tracking-wider">Prev Hash</span>
                      <span className="text-zinc-500 truncate">
                        {block.prevHash}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
