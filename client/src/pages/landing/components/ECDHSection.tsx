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
  info: "text-zinc-400",
  success: "text-emerald-400",
  key: "text-amber-400",
  cipher: "text-cyan-400",
  warning: "text-yellow-500",
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
          text: `--- Public keys exchanged over insecure channel ---`,
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
          text: `MATCH CONFIRMED: ${sAlice} === ${sBob}`,
          type: "success",
        },
        delay: 700,
      },
      {
        entry: {
          text: `Encrypting "${message}" with AES-256 using key ${sAlice} ...`,
          type: "info",
        },
        delay: 600,
      },
      {
        entry: { text: `Ciphertext: 0x${ciphertext}`, type: "cipher" },
        delay: 500,
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
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <h3 className="text-2xl md:text-3xl font-bold text-cyan-400 mb-3">
          ECDH Key Exchange + AES-256
        </h3>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Two parties independently compute an identical shared secret without
          ever transmitting it. This secret then serves as the symmetric key for
          AES-256 encryption of all messages.
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
          <label className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-3 block">
            Plaintext Message
          </label>
          <input
            id="ecdh-message-input"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter a message to encrypt..."
            maxLength={64}
            disabled={isRunning}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white font-mono focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-zinc-700 disabled:opacity-50"
          />
        </div>

        <div className="flex gap-4 justify-center">
          <button
            id="ecdh-derive-btn"
            onClick={handleDerive}
            disabled={!message.trim() || isRunning}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] disabled:shadow-none"
          >
            {isRunning ? "Processing..." : "Derive Secret & Encrypt"}
          </button>
          {logs.length > 0 && !isRunning && (
            <button
              onClick={handleReset}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {logs.length > 0 && (
          <div
            ref={logRef}
            className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 font-mono text-xs md:text-sm max-h-80 overflow-y-auto space-y-1.5 animate-in fade-in duration-300"
          >
            {logs.map((log, idx) => (
              <div
                key={idx}
                className={`${LOG_COLORS[log.type]} animate-in slide-in-from-left-2 fade-in duration-200`}
              >
                <span className="text-zinc-700 select-none mr-2">{">"}</span>
                {log.text}
              </div>
            ))}
            {isRunning && (
              <div className="text-zinc-600 animate-pulse">
                <span className="text-zinc-700 select-none mr-2">{">"}</span>_
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
