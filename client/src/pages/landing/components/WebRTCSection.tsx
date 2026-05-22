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
    "w-20 h-20 md:w-24 md:h-24 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-700 flex-shrink-0 backdrop-blur-md relative overflow-hidden";

  return (
    <div className="space-y-10">
      <style>{`
        @keyframes packetSlide {
          0% { left: 0; opacity: 0; transform: scale(0.8) translateY(-50%); }
          10% { opacity: 1; transform: scale(1) translateY(-50%); }
          90% { opacity: 1; transform: scale(1) translateY(-50%); }
          100% { left: calc(100% - 4rem); opacity: 0; transform: scale(0.8) translateY(-50%); }
        }
      `}</style>

      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="flex justify-center items-center gap-3 mb-2">
          <svg className="w-8 h-8 text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <h3 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            WebRTC Peer-to-Peer
          </h3>
        </div>
        <p className="text-zinc-400/80 text-sm md:text-base leading-relaxed font-light">
          The relay server facilitates only the initial signaling handshake.
          Once the DataChannel is established, all data flows directly between
          peers with absolute zero server storage.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-zinc-950/60 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 md:p-14 mb-8 relative shadow-[0_8px_32px_rgba(0,0,0,0.8)] overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-purple-500/5 blur-[100px] pointer-events-none" />
          
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-8 text-center flex items-center justify-center gap-3">
            <span className="w-12 h-px bg-white/10" />
            Signaling Handshake
            <span className="w-12 h-px bg-white/10" />
          </p>
          
          <div className="flex items-center justify-between gap-4 mb-16 relative z-10">
            <div
              className={`${nodeBase} ${sigActive || tunnelActive ? "border-purple-500 bg-purple-500/10 shadow-[0_0_30px_rgba(168,85,247,0.3)]" : "border-white/10 bg-black/40"}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent opacity-50" />
              <span className="text-2xl font-black text-purple-200 drop-shadow-md z-10">A</span>
              <span className="text-[10px] text-purple-300/60 font-semibold mt-1 uppercase tracking-widest z-10">Alice</span>
            </div>

            <div className="flex-1 relative flex items-center">
              <div
                className={`w-full transition-colors duration-500 ${sigActive ? "border-amber-500/60" : "border-white/10"}`}
                style={{ borderTop: "2px dashed" }}
              />
              {sigDot === "left" && (
                <div className="absolute top-1/2 left-[10%] -translate-y-1/2 w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,1)] animate-ping" />
              )}
              {sigDot === "center" && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,1)] animate-ping" />
              )}
            </div>

            <div
              className={`${nodeBase} ${sigActive ? "border-amber-500 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.3)]" : "border-white/10 bg-black/40"}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-transparent opacity-50" />
              <span className="text-2xl font-black text-amber-200 drop-shadow-md z-10">R</span>
              <span className="text-[10px] text-amber-300/60 font-semibold mt-1 uppercase tracking-widest z-10">Relay</span>
              {phase === "complete" && (
                <div className="absolute -bottom-6 text-[9px] text-rose-400 font-mono tracking-widest bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 whitespace-nowrap">
                  0 BYTES STORED
                </div>
              )}
            </div>

            <div className="flex-1 relative flex items-center">
              <div
                className={`w-full transition-colors duration-500 ${sigActive ? "border-amber-500/60" : "border-white/10"}`}
                style={{ borderTop: "2px dashed" }}
              />
              {sigDot === "right" && (
                <div className="absolute top-1/2 right-[10%] -translate-y-1/2 w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,1)] animate-ping" />
              )}
            </div>

            <div
              className={`${nodeBase} ${tunnelActive ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_30px_rgba(6,182,212,0.3)]" : sigActive ? "border-amber-500/40 bg-amber-500/5" : "border-white/10 bg-black/40"}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-transparent opacity-50" />
              <span className="text-2xl font-black text-cyan-200 drop-shadow-md z-10">B</span>
              <span className="text-[10px] text-cyan-300/60 font-semibold mt-1 uppercase tracking-widest z-10">Bob</span>
            </div>
          </div>

          <p
            className={`text-[10px] uppercase tracking-[0.3em] font-bold mb-6 text-center transition-colors duration-500 flex items-center justify-center gap-3 ${tunnelActive ? "text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]" : "text-zinc-600"}`}
          >
            <span className={`w-12 h-px ${tunnelActive ? "bg-emerald-500/50" : "bg-white/10"}`} />
            Direct P2P Data Channel
            <span className={`w-12 h-px ${tunnelActive ? "bg-emerald-500/50" : "bg-white/10"}`} />
          </p>
          
          <div className="flex items-center gap-4 relative z-10 max-w-xl mx-auto">
            <div
              className={`w-5 h-5 rounded-full flex-shrink-0 transition-all duration-700 ${tunnelActive ? "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]" : "bg-white/5 border border-white/10"}`}
            />
            <div className="flex-1 relative h-10 flex items-center bg-black/40 rounded-full border border-white/5 shadow-inner px-2">
              <div
                className={`h-1 w-full rounded-full transition-all duration-1000 ${tunnelActive ? "bg-emerald-500/40 shadow-[0_0_10px_rgba(52,211,153,0.3)]" : "bg-white/5"}`}
              />
              {(phase === "transmitting" || phase === "complete") && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-6 rounded-md bg-gradient-to-r from-emerald-400 to-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.8)] border border-white/20"
                  style={{
                    width: "4rem",
                    animation: packetLaunched
                      ? "packetSlide 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards"
                      : "none",
                    left: packetLaunched ? undefined : "0%",
                  }}
                >
                  <span className="text-[9px] font-mono font-black text-emerald-950 tracking-widest uppercase">
                    PKT
                  </span>
                </div>
              )}
            </div>
            <div
              className={`w-5 h-5 rounded-full flex-shrink-0 transition-all duration-700 ${tunnelActive ? "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]" : "bg-white/5 border border-white/10"}`}
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-full md:w-1/3 flex flex-col gap-3">
            <button
              id="webrtc-transmit-btn"
              onClick={handleTransmit}
              disabled={phase !== "idle" && phase !== "complete"}
              className="group relative w-full bg-purple-500/10 text-purple-300 border border-purple-500/30 disabled:border-white/5 disabled:bg-white/[0.02] disabled:text-zinc-600 px-6 py-3 rounded-xl font-bold tracking-wide transition-all duration-300 hover:bg-purple-500/20 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:shadow-none overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              {phase === "idle" || phase === "complete"
                ? "ESTABLISH TUNNEL"
                : "TRANSMITTING..."}
            </button>
            {phase === "complete" && (
              <button
                onClick={handleReset}
                className="w-full bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 text-zinc-400 px-6 py-4 rounded-xl font-medium transition-all"
              >
                Reset Network
              </button>
            )}
          </div>

          <div
            ref={logRef}
            className="w-full md:w-2/3 bg-black/60 border border-white/5 rounded-2xl p-6 font-mono text-[13px] md:text-sm h-48 overflow-y-auto space-y-2 relative shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] custom-scrollbar"
          >
            {logs.length === 0 && (
               <div className="absolute inset-0 flex items-center justify-center opacity-30">
                 <span className="text-zinc-600">Network idle...</span>
               </div>
            )}
            {logs.map((log, idx) => {
              const color =
                log.type === "success"
                  ? "text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]"
                  : log.type === "key"
                    ? "text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]"
                    : log.type === "warning"
                      ? "text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded"
                      : "text-zinc-500";
              return (
                <div
                  key={idx}
                  className={`${color} animate-in slide-in-from-left-2 fade-in duration-200`}
                >
                  <span className="text-zinc-600 select-none mr-3">
                    {">"}
                  </span>
                  {log.text}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
