import { useState, useEffect, useRef } from "react";

interface LogEntry {
  text: string;
  type: "info" | "success" | "key" | "cipher" | "warning";
}

type WebRTCPhase =
  | "idle"
  | "signaling"
  | "ice"
  | "tunnel"
  | "transmitting"
  | "complete";

/**
 * Interactive visualization of WebRTC peer-to-peer data channel establishment.
 * @returns {JSX.Element}
 */
export default function WebRTCSection() {
  const [phase, setPhase] = useState<WebRTCPhase>("idle");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sigDot, setSigDot] = useState<
    "hidden" | "left" | "center" | "right"
  >("hidden");
  const [packetLaunched, setPacketLaunched] = useState(false);
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

  const addLog = (entry: LogEntry) => {
    setLogs((prev) => [...prev, entry]);
  };

  const schedule = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  };

  const handleTransmit = () => {
    if (phase !== "idle" && phase !== "complete") return;
    setPhase("signaling");
    setLogs([]);
    setSigDot("hidden");
    setPacketLaunched(false);
    timersRef.current = [];

    schedule(() => {
      addLog({ text: "[SDP] Alice creates Offer", type: "info" });
      setSigDot("left");
    }, 300);

    schedule(() => {
      addLog({
        text: "[SDP] Alice -> Relay Server: Offer forwarded",
        type: "info",
      });
      setSigDot("center");
    }, 1000);

    schedule(() => {
      addLog({
        text: "[SDP] Relay Server -> Bob: Offer delivered",
        type: "info",
      });
      setSigDot("right");
    }, 1700);

    schedule(() => {
      setPhase("ice");
      setSigDot("hidden");
      addLog({
        text: "[SDP] Bob creates Answer -> Relay -> Alice",
        type: "info",
      });
      addLog({ text: "[ICE] Candidate exchange complete", type: "success" });
    }, 2500);

    schedule(() => {
      setPhase("tunnel");
      addLog({
        text: "[P2P] Direct WebRTC DataChannel established!",
        type: "success",
      });
    }, 3300);

    schedule(() => {
      setPhase("transmitting");
      addLog({
        text: "[P2P] Alice -> Bob: AES-256 encrypted payload",
        type: "key",
      });
    }, 4000);

    schedule(() => {
      setPacketLaunched(true);
    }, 4100);

    schedule(() => {
      addLog({
        text: "[Relay] Total data stored: 0 bytes",
        type: "warning",
      });
      addLog({ text: "[P2P] Packet delivered successfully", type: "success" });
      setPhase("complete");
    }, 5400);
  };

  const handleReset = () => {
    timersRef.current.forEach(clearTimeout);
    setPhase("idle");
    setLogs([]);
    setSigDot("hidden");
    setPacketLaunched(false);
  };

  const sigActive = phase === "signaling" || phase === "ice";
  const tunnelActive =
    phase === "tunnel" ||
    phase === "transmitting" ||
    phase === "complete";

  const nodeBase =
    "w-20 h-20 md:w-24 md:h-24 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-500 flex-shrink-0";

  return (
    <div className="space-y-8">
      <style>{`
        @keyframes packetSlide {
          0% { left: 0; }
          100% { left: calc(100% - 3rem); }
        }
      `}</style>

      <div className="text-center max-w-2xl mx-auto">
        <h3 className="text-2xl md:text-3xl font-bold text-purple-400 mb-3">
          WebRTC Peer-to-Peer
        </h3>
        <p className="text-zinc-400 text-sm leading-relaxed">
          The relay server facilitates only the initial signaling handshake.
          Once the DataChannel is established, all data flows directly between
          peers with zero server storage.
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 md:p-10 mb-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600 font-semibold mb-6 text-center">
            Signaling Path
          </p>
          <div className="flex items-center justify-between gap-2 md:gap-4 mb-10 relative">
            <div
              className={`${nodeBase} ${sigActive || phase === "transmitting" || phase === "complete" ? "border-purple-500 bg-zinc-900 shadow-[0_0_20px_rgba(168,85,247,0.15)]" : "border-zinc-700 bg-zinc-900/50"}`}
            >
              <span className="text-lg font-bold text-purple-300">A</span>
              <span className="text-[9px] text-zinc-500 font-semibold mt-0.5">
                Alice
              </span>
            </div>

            <div className="flex-1 relative flex items-center">
              <div
                className={`w-full transition-colors duration-500 ${sigActive ? "border-amber-500/60" : "border-zinc-800"}`}
                style={{ borderTop: "2px dashed" }}
              />
              {sigDot === "left" && (
                <div className="absolute top-1/2 left-[10%] -translate-y-1/2 w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)] animate-ping" />
              )}
              {sigDot === "center" && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)] animate-ping" />
              )}
            </div>

            <div
              className={`${nodeBase} ${sigActive ? "border-amber-500 bg-zinc-900 shadow-[0_0_20px_rgba(245,158,11,0.15)]" : "border-zinc-700 bg-zinc-900/50"}`}
            >
              <span className="text-lg font-bold text-amber-400">R</span>
              <span className="text-[9px] text-zinc-500 font-semibold mt-0.5 text-center leading-tight">
                Relay
              </span>
              {phase === "complete" && (
                <span className="text-[8px] text-red-400 font-mono mt-0.5">
                  0 bytes
                </span>
              )}
            </div>

            <div className="flex-1 relative flex items-center">
              <div
                className={`w-full transition-colors duration-500 ${sigActive ? "border-amber-500/60" : "border-zinc-800"}`}
                style={{ borderTop: "2px dashed" }}
              />
              {sigDot === "right" && (
                <div className="absolute top-1/2 right-[10%] -translate-y-1/2 w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)] animate-ping" />
              )}
            </div>

            <div
              className={`${nodeBase} ${phase === "transmitting" || phase === "complete" ? "border-cyan-500 bg-zinc-900 shadow-[0_0_20px_rgba(6,182,212,0.15)]" : sigActive ? "border-amber-500/50 bg-zinc-900/70" : "border-zinc-700 bg-zinc-900/50"}`}
            >
              <span className="text-lg font-bold text-cyan-300">B</span>
              <span className="text-[9px] text-zinc-500 font-semibold mt-0.5">
                Bob
              </span>
            </div>
          </div>

          <p
            className={`text-[10px] uppercase tracking-[0.25em] font-semibold mb-4 text-center transition-colors duration-500 ${tunnelActive ? "text-emerald-500/80" : "text-zinc-700"}`}
          >
            Direct P2P Tunnel
          </p>
          <div className="flex items-center gap-2 md:gap-4">
            <div
              className={`w-4 h-4 rounded-full flex-shrink-0 transition-all duration-500 ${tunnelActive ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]" : "bg-zinc-800"}`}
            />
            <div className="flex-1 relative h-7 flex items-center">
              <div
                className={`h-0.5 w-full rounded-full transition-all duration-700 ${tunnelActive ? "bg-emerald-500/50" : "bg-zinc-800/50"}`}
              />
              {(phase === "transmitting" || phase === "complete") && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-5 rounded-md bg-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                  style={{
                    width: "3rem",
                    animation: packetLaunched
                      ? "packetSlide 1.2s ease-out forwards"
                      : "none",
                    left: packetLaunched ? undefined : "0%",
                  }}
                >
                  <span className="text-[7px] font-mono font-bold text-zinc-950 tracking-wider">
                    PKT
                  </span>
                </div>
              )}
            </div>
            <div
              className={`w-4 h-4 rounded-full flex-shrink-0 transition-all duration-500 ${tunnelActive ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]" : "bg-zinc-800"}`}
            />
          </div>
        </div>

        <div className="flex gap-4 justify-center mb-6">
          <button
            id="webrtc-transmit-btn"
            onClick={handleTransmit}
            disabled={
              phase !== "idle" && phase !== "complete"
            }
            className="bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_40px_rgba(168,85,247,0.6)] disabled:shadow-none"
          >
            {phase === "idle" || phase === "complete"
              ? "Transmit P2P Packet"
              : "Transmitting..."}
          </button>
          {phase === "complete" && (
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
            className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 font-mono text-xs md:text-sm max-h-64 overflow-y-auto space-y-1.5 animate-in fade-in duration-300"
          >
            {logs.map((log, idx) => {
              const color =
                log.type === "success"
                  ? "text-emerald-400"
                  : log.type === "key"
                    ? "text-purple-400"
                    : log.type === "warning"
                      ? "text-red-400"
                      : "text-zinc-400";
              return (
                <div
                  key={idx}
                  className={`${color} animate-in slide-in-from-left-2 fade-in duration-200`}
                >
                  <span className="text-zinc-700 select-none mr-2">
                    {">"}
                  </span>
                  {log.text}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
