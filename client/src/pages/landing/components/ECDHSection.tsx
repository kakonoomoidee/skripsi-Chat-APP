import { useState, useEffect, useRef } from "react";

/**
 * Simulates symmetric encryption by XOR-ing character codes with key-derived bytes.
 * @param {string} plaintext
 * @param {number} key
 * @returns {string}
 */
function simulateAES(plaintext: string, key: number): string {
  const k1 = key & 0xff;
  const k2 = (key >>> 8) & 0xff;
  return Array.from(plaintext)
    .map((ch) =>
      ((ch.charCodeAt(0) ^ k1) + k2).toString(16).padStart(2, "0"),
    )
    .join("");
}

interface LogEntry {
  text: string;
  type: "info" | "success" | "key" | "cipher" | "warning";
}

const LOG_COLORS: Record<LogEntry["type"], string> = {
  info: "text-zinc-500",
  success: "text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]",
  key: "text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]",
  cipher: "text-cyan-400 font-bold tracking-widest drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]",
  warning: "text-rose-400 border-l-2 border-rose-500/50 pl-3 py-1 bg-rose-500/5",
};

/**
 * Interactive demonstration of ECDH key exchange and AES symmetric encryption.
 * @returns {JSX.Element}
 */
export default function ECDHSection() {
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const handleDerive = () => {
    if (!message.trim() || isRunning) return;
    setIsRunning(true);
    setLogs([]);
    timersRef.current = [];

    const G = 7;
    const a = 23;
    const b = 47;
    const A = a * G;
    const B = b * G;
    const sAlice = a * B;
    const sBob = b * A;
    const ciphertext = simulateAES(message, sAlice);

    const steps: { entry: LogEntry; delay: number }[] = [
      {
        entry: { text: `[Alice] Private Key generated: a = ${a}`, type: "key" },
        delay: 400,
      },
      {
        entry: {
          text: `[Alice] Public Key: A = a x G = ${a} x ${G} = ${A}`,
          type: "info",
        },
        delay: 500,
      },
      {
        entry: { text: `[Bob]   Private Key generated: b = ${b}`, type: "key" },
        delay: 400,
      },
      {
        entry: {
          text: `[Bob]   Public Key: B = b x G = ${b} x ${G} = ${B}`,
          type: "info",
        },
        delay: 500,
      },
      {
        entry: {
          text: `--- PUBLIC KEYS EXCHANGED OVER INSECURE CHANNEL ---`,
          type: "warning",
        },
        delay: 700,
      },
      {
        entry: {
          text: `[Alice] Shared Secret: S = a x B = ${a} x ${B} = ${sAlice}`,
          type: "success",
        },
        delay: 600,
      },
      {
        entry: {
          text: `[Bob]   Shared Secret: S = b x A = ${b} x ${A} = ${sBob}`,
          type: "success",
        },
        delay: 600,
      },
      {
        entry: {
          text: `[SYSTEM] MATCH CONFIRMED: ${sAlice} === ${sBob}`,
          type: "success",
        },
        delay: 700,
      },
      {
        entry: {
          text: `[AES-GCM] Encrypting payload with derived symmetric key...`,
          type: "info",
        },
        delay: 600,
      },
      {
        entry: { text: `CIPHERTEXT OUTPUT: 0x${ciphertext}`, type: "cipher" },
        delay: 800,
      },
    ];

    let cumulative = 0;
    steps.forEach((step, idx) => {
      cumulative += step.delay;
      const timer = setTimeout(() => {
        setLogs((prev) => [...prev, step.entry]);
        if (idx === steps.length - 1) setIsRunning(false);
      }, cumulative);
      timersRef.current.push(timer);
    });
  };

  const handleReset = () => {
    timersRef.current.forEach(clearTimeout);
    setLogs([]);
    setMessage("");
    setIsRunning(false);
  };

  return (
    <div className="space-y-10">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="flex justify-center items-center gap-3 mb-2">
          <svg className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <h3 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            ECDH Key Exchange + AES-256
          </h3>
        </div>
        <p className="text-zinc-400/80 text-sm md:text-base leading-relaxed font-light">
          Two parties independently compute an identical shared secret without
          ever transmitting it. This secret then serves as the symmetric key for
          military-grade AES-256 encryption.
        </p>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-5 flex flex-col gap-5">
          <div className="bg-zinc-950/60 backdrop-blur-2xl border border-white/5 rounded-2xl p-6 flex-1 shadow-[0_8px_32px_rgba(0,0,0,0.8)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-3 block flex items-center gap-2 relative z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              Plaintext Message
            </label>
            <textarea
              id="ecdh-message-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter sensitive payload to encrypt..."
              maxLength={120}
              disabled={isRunning}
              rows={4}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-cyan-300 font-mono text-sm focus:border-cyan-500/50 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all placeholder:text-zinc-700/50 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] resize-none disabled:opacity-50 relative z-10"
            />
          </div>

          <div className="flex flex-col gap-3">
            <button
              id="ecdh-derive-btn"
              onClick={handleDerive}
              disabled={!message.trim() || isRunning}
              className="group relative w-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 disabled:border-white/5 disabled:bg-white/[0.02] disabled:text-zinc-600 px-6 py-3 rounded-xl font-bold tracking-wide transition-all duration-300 hover:bg-cyan-500/20 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:shadow-none overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              {isRunning ? "PROCESSING PIPELINE..." : "DERIVE SECRET & ENCRYPT"}
            </button>
            {logs.length > 0 && !isRunning && (
              <button
                onClick={handleReset}
                className="w-full bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 text-zinc-400 px-6 py-4 rounded-xl font-medium transition-all"
              >
                Clear Terminal
              </button>
            )}
          </div>
        </div>

        <div className="md:col-span-7 bg-[#050505] border border-white/5 rounded-3xl overflow-hidden relative shadow-[0_0_40px_rgba(0,0,0,0.8)] flex flex-col h-[400px]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/50 to-blue-600/50" />
          <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Protocol Terminal</span>
            </div>
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
            </div>
          </div>
          
          <div
            ref={logRef}
            className="flex-1 p-6 font-mono text-[13px] md:text-sm overflow-y-auto space-y-3 relative custom-scrollbar"
          >
            {logs.length === 0 && !isRunning && (
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <span className="text-zinc-600">Awaiting execution...</span>
              </div>
            )}
            {logs.map((log, idx) => (
              <div
                key={idx}
                className={`${LOG_COLORS[log.type]} animate-in slide-in-from-bottom-2 fade-in duration-300`}
              >
                {log.type !== "warning" && <span className="text-zinc-600 select-none mr-3">{">"}</span>}
                {log.text}
              </div>
            ))}
            {isRunning && (
              <div className="text-cyan-500/50 animate-pulse mt-2">
                <span className="text-zinc-600 select-none mr-3">{">"}</span>_
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
