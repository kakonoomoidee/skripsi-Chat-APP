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
      label: "Sign Tx",
      active: phase === "signing",
      done: ["mining", "confirmed", "appended"].includes(phase),
    },
    {
      label: "Mine Block",
      active: phase === "mining",
      done: phase === "confirmed" || phase === "appended",
    },
    {
      label: "Append",
      active: phase === "confirmed",
      done: phase === "appended",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <h3 className="text-2xl md:text-3xl font-bold text-emerald-400 mb-3">
          Blockchain Identity Registry
        </h3>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Register your username on the blockchain. The transaction is signed
          with your private key, mined via Proof-of-Work, and permanently
          appended to the distributed ledger.
        </p>
      </div>

      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between">
          {phaseSteps.map((step, idx) => (
            <div key={step.label} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                    step.done
                      ? "bg-emerald-500 text-zinc-950"
                      : step.active
                        ? "bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 animate-pulse"
                        : "bg-zinc-800 text-zinc-600 border border-zinc-700"
                  }`}
                >
                  {step.done ? "\u2713" : idx + 1}
                </div>
                <span
                  className={`text-[10px] mt-1.5 font-semibold transition-colors whitespace-nowrap ${
                    step.done || step.active
                      ? "text-emerald-400"
                      : "text-zinc-600"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < phaseSteps.length - 1 && (
                <div
                  className={`flex-1 h-px mx-2 transition-colors duration-500 ${
                    step.done ? "bg-emerald-500/60" : "bg-zinc-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
          <label className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-3 block">
            Username to Register
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
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-700 disabled:opacity-50"
          />
        </div>

        {phase !== "idle" && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 font-mono text-xs md:text-sm space-y-3 animate-in fade-in duration-300">
            <div>
              <span className="text-zinc-600">Tx: </span>
              <span className="text-amber-400">
                {`{ type: "REGISTER", username: "${username}", from: "0x${simulateHash(username).substring(0, 8)}..." }`}
              </span>
            </div>
            {signature && (
              <div>
                <span className="text-zinc-600">Sig: </span>
                <span className="text-purple-400">
                  0x{signature.substring(0, 32)}...
                </span>
              </div>
            )}
            {(phase === "mining" ||
              phase === "confirmed" ||
              phase === "appended") && (
              <>
                <div className="border-t border-zinc-800 pt-3">
                  <span className="text-zinc-600">Nonce: </span>
                  <span
                    className={
                      phase === "mining"
                        ? "text-yellow-400"
                        : "text-emerald-400"
                    }
                  >
                    {displayNonce}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-600">Hash: </span>
                  <span
                    className={
                      currentHash.startsWith("0000")
                        ? "text-emerald-400"
                        : "text-red-400"
                    }
                  >
                    {currentHash || "computing..."}
                  </span>
                  {currentHash.startsWith("0000") && (
                    <span className="text-emerald-500 ml-2 font-bold">
                      VALID
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-zinc-600">Target: </span>
                  <span className="text-zinc-500">
                    hash must start with &quot;0000&quot;
                  </span>
                </div>
              </>
            )}
            {phase === "appended" && (
              <div className="border-t border-zinc-800 pt-3 text-emerald-400 font-semibold">
                Block #{chain.length - 1} successfully appended to chain!
              </div>
            )}
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <button
            id="blockchain-mine-btn"
            onClick={handleMine}
            disabled={
              !username.trim() || (phase !== "idle" && phase !== "appended")
            }
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] disabled:shadow-none"
          >
            {phase === "mining" ? "Mining..." : "Sign Tx & Mine Block"}
          </button>
          {phase === "appended" && (
            <button
              onClick={handleReset}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Reset Chain
            </button>
          )}
        </div>

        {chain.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
              Chain State
            </h4>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {chain.map((block, idx) => (
                <div
                  key={block.index}
                  className={`flex-shrink-0 w-52 bg-zinc-900/60 border rounded-xl p-4 text-xs font-mono transition-all duration-500 ${
                    idx === chain.length - 1 && phase === "appended"
                      ? "border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-in slide-in-from-right-4 fade-in duration-500"
                      : "border-zinc-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-emerald-400 font-bold">
                      Block #{block.index}
                    </span>
                    <span className="text-zinc-600">{block.timestamp}</span>
                  </div>
                  <div className="space-y-1 text-[10px]">
                    <div>
                      <span className="text-zinc-600">Data: </span>
                      <span className="text-zinc-300">{block.data}</span>
                    </div>
                    <div>
                      <span className="text-zinc-600">Nonce: </span>
                      <span className="text-zinc-400">{block.nonce}</span>
                    </div>
                    <div>
                      <span className="text-zinc-600">Hash: </span>
                      <span className="text-emerald-400/80">{block.hash}</span>
                    </div>
                    <div>
                      <span className="text-zinc-600">Prev: </span>
                      <span className="text-zinc-500">
                        {block.prevHash.substring(0, 16)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
