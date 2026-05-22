import { useState, useEffect, useRef } from "react";

/**
 * Interactive demonstration of Elliptic Curve Cryptography using Canvas API.
 * @returns {JSX.Element}
 */
const generateHexKey = (x: number, y: number, prefix: string = "0x04") => {
  const seed = Math.abs(Math.sin(x * 12.9898 + y * 78.233)) * 43758.5453;
  let hex = seed.toString(16).replace('.', '').padEnd(64, 'c').substring(0, 64);
  return `${prefix}${hex.substring(0, 6)}...${hex.substring(58)}`;
};

const generatePrivKeyHex = (k: string) => {
  const seed = parseInt(k) * 1234567.89;
  let hex = seed.toString(16).replace('.', '').padEnd(64, 'e').substring(0, 64);
  return `0x${hex.substring(0, 6)}...${hex.substring(58)}`;
};


export default function ECCSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [privateKey, setPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState<{ x: number; y: number } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>(0);

  const drawBase = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scale: number,
    offsetX: number,
    offsetY: number
  ) => {
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += scale) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
    }
    for (let i = 0; i < height; i += scale) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, offsetY);
    ctx.lineTo(width, offsetY);
    ctx.moveTo(offsetX, 0);
    ctx.lineTo(offsetX, height);
    ctx.stroke();

    ctx.shadowBlur = 15;
    ctx.shadowColor = "rgba(99, 102, 241, 0.5)";
    ctx.strokeStyle = "#818cf8"; 
    ctx.lineWidth = 2;
    ctx.beginPath();
    let first = true;
    for (let px = 0; px < width; px++) {
      const x = (px - offsetX) / scale;
      const y2 = x * x * x - 2 * x + 2;
      if (y2 >= 0) {
        const y = Math.sqrt(y2);
        const py = offsetY - y * scale;
        if (first) {
          ctx.moveTo(px, py);
          first = false;
        } else {
          ctx.lineTo(px, py);
        }
      } else {
        first = true;
      }
    }
    ctx.stroke();

    ctx.beginPath();
    first = true;
    for (let px = 0; px < width; px++) {
      const x = (px - offsetX) / scale;
      const y2 = x * x * x - 2 * x + 2;
      if (y2 >= 0) {
        const y = -Math.sqrt(y2);
        const py = offsetY - y * scale;
        if (first) {
          ctx.moveTo(px, py);
          first = false;
        } else {
          ctx.lineTo(px, py);
        }
      } else {
        first = true;
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0; 

    const gX = 1;
    const gY = 1;
    const pxG = offsetX + gX * scale;
    const pyG = offsetY - gY * scale;
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#34d399";
    ctx.fillStyle = "#34d399";
    ctx.beginPath();
    ctx.arc(pxG, pyG, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "11px monospace";
    ctx.fillText("G(1, 1)", pxG + 10, pyG - 10);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        drawBase(ctx, canvas.width, canvas.height, 70, canvas.width / 2 + 50, canvas.height / 2);
      }
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handleGenerate = () => {
    const k = parseInt(privateKey, 10);
    if (isNaN(k) || k <= 0 || k > 99) return;

    setIsAnimating(true);
    setPublicKey(null);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const scale = 70;
    const offsetX = width / 2 + 50;
    const offsetY = height / 2;

    const G = { x: 1, y: 1 };
    let current = G;
    const steps: { start: { x: number; y: number }; intersect: { x: number; y: number }; end: { x: number; y: number } }[] = [];

    for (let i = 2; i <= k; i++) {
      let m;
      if (Math.abs(current.x - G.x) < 0.0001) {
        m = (3 * current.x * current.x - 2) / (2 * current.y);
      } else {
        m = (G.y - current.y) / (G.x - current.x);
      }
      const x3 = m * m - current.x - G.x;
      const y3Unreflected = m * (x3 - current.x) + current.y;
      const end = { x: x3, y: -y3Unreflected };
      steps.push({ start: current, intersect: { x: x3, y: y3Unreflected }, end });
      current = end;
    }

    if (k === 1) {
      drawBase(ctx, width, height, scale, offsetX, offsetY);
      setPublicKey(G);
      setIsAnimating(false);
      return;
    }

    let startTime: number | null = null;
    const durationPerBounce = Math.min(800, 3000 / k);

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const totalDuration = steps.length * durationPerBounce;

      drawBase(ctx, width, height, scale, offsetX, offsetY);

      const currentStepIdx = Math.min(Math.floor(elapsed / durationPerBounce), steps.length - 1);
      const stepElapsed = elapsed - currentStepIdx * durationPerBounce;

      ctx.lineWidth = 1.5;
      for (let i = 0; i < currentStepIdx; i++) {
        const step = steps[i];

        ctx.strokeStyle = "rgba(244, 63, 94, 0.6)";
        ctx.beginPath();
        ctx.moveTo(offsetX + step.start.x * scale, offsetY - step.start.y * scale);
        ctx.lineTo(offsetX + step.intersect.x * scale, offsetY - step.intersect.y * scale);
        ctx.stroke();

        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "rgba(52, 211, 153, 0.6)";
        ctx.beginPath();
        ctx.moveTo(offsetX + step.intersect.x * scale, offsetY - step.intersect.y * scale);
        ctx.lineTo(offsetX + step.end.x * scale, offsetY - step.end.y * scale);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#34d399";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#34d399";
        ctx.beginPath();
        ctx.arc(offsetX + step.end.x * scale, offsetY - step.end.y * scale, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (elapsed < totalDuration) {
        const step = steps[currentStepIdx];
        const halfDuration = durationPerBounce / 2;

        const startPx = offsetX + step.start.x * scale;
        const startPy = offsetY - step.start.y * scale;
        const intPx = offsetX + step.intersect.x * scale;
        const intPy = offsetY - step.intersect.y * scale;
        const endPx = offsetX + step.end.x * scale;
        const endPy = offsetY - step.end.y * scale;

        ctx.shadowBlur = 5;
        if (stepElapsed < halfDuration) {
          const p = stepElapsed / halfDuration;
          const curPx = startPx + (intPx - startPx) * p;
          const curPy = startPy + (intPy - startPy) * p;

          ctx.shadowColor = "rgba(244, 63, 94, 1)";
          ctx.strokeStyle = "rgba(244, 63, 94, 1)";
          ctx.beginPath();
          ctx.moveTo(startPx, startPy);
          ctx.lineTo(curPx, curPy);
          ctx.stroke();
        } else {
          ctx.shadowColor = "rgba(244, 63, 94, 1)";
          ctx.strokeStyle = "rgba(244, 63, 94, 1)";
          ctx.beginPath();
          ctx.moveTo(startPx, startPy);
          ctx.lineTo(intPx, intPy);
          ctx.stroke();

          const p = (stepElapsed - halfDuration) / halfDuration;
          const curPx = intPx + (endPx - intPx) * p;
          const curPy = intPy + (endPy - intPy) * p;

          ctx.setLineDash([4, 4]);
          ctx.shadowColor = "rgba(52, 211, 153, 1)";
          ctx.strokeStyle = "rgba(52, 211, 153, 1)";
          ctx.beginPath();
          ctx.moveTo(intPx, intPy);
          ctx.lineTo(curPx, curPy);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.shadowBlur = 0;
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setPublicKey(current);
        setIsAnimating(false);

        const px = offsetX + current.x * scale;
        const py = offsetY - current.y * scale;
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#10b981";
        ctx.fillStyle = "#10b981";
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const handleReset = () => {
    setPrivateKey("");
    setPublicKey(null);
    setIsAnimating(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        drawBase(ctx, canvas.width, canvas.height, 70, canvas.width / 2 + 50, canvas.height / 2);
      }
    }
  };

  return (
    <div className="space-y-10">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h3 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">
          Elliptic Curve Cryptography
        </h3>
        <p className="text-zinc-400/80 text-sm md:text-base leading-relaxed font-light">
          A Public Key is derived from a Private Key through scalar
          multiplication with a fixed Generator Point (G) on an elliptic curve.
          This one-way mathematical function is computationally infeasible to
          reverse.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="w-full lg:w-1/3 space-y-6 flex flex-col justify-between">
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-7 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]">
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-4 block flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Private Key (bounces)
            </label>
            <input
              id="ecc-private-key"
              type="number"
              min="1"
              max="99"
              value={privateKey}
              onChange={(e) => {
                setPrivateKey(e.target.value);
                setPublicKey(null);
              }}
              placeholder="e.g. 5"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-indigo-300 font-mono text-xl focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-700/50 shadow-inner [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
            />
            <p className="text-[11px] text-zinc-500 mt-4 leading-relaxed font-light">
              Number of geometric point additions starting from G(1, 1).
            </p>
          </div>
          
          <div className="flex flex-col gap-4">
            <button
              id="ecc-generate-btn"
              onClick={handleGenerate}
              disabled={!privateKey || parseInt(privateKey, 10) <= 0 || isAnimating}
              className="group relative w-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 disabled:border-white/5 disabled:bg-white/[0.02] disabled:text-zinc-600 px-8 py-4 rounded-xl font-bold tracking-wide transition-all duration-300 hover:bg-indigo-500/20 hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] disabled:shadow-none overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full" />
              {isAnimating ? "CALCULATING..." : "GENERATE PUBLIC KEY"}
            </button>
            {(publicKey || isAnimating) && (
              <button
                onClick={handleReset}
                className="w-full bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 text-zinc-400 px-6 py-4 rounded-xl font-medium transition-all"
              >
                Reset Canvas
              </button>
            )}
          </div>
          
          {publicKey !== null && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 relative overflow-hidden animate-in zoom-in-95 fade-in duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full pointer-events-none" />
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse" />
                <span className="text-emerald-400/80 font-bold text-xs uppercase tracking-widest">
                  ECC Session Parameters
                </span>
              </div>
              
              <div className="space-y-4 font-mono text-sm text-zinc-300">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-zinc-500">Generator (G)</span>
                  <span className="text-zinc-200">X: 1.0000, Y: 1.0000</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-zinc-500">Private Key (k)</span>
                  <span className="text-indigo-300 font-bold">{privateKey}</span>
                </div>
                <div className="flex flex-col gap-2 pt-1 pb-3 border-b border-white/5">
                  <span className="text-emerald-400/80 text-[10px] uppercase tracking-wider font-sans font-bold">Public Key (P = k * G)</span>
                  <div className="bg-black/30 rounded-xl p-3 border border-emerald-500/20 text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)] flex justify-between">
                    <span>X: {publicKey.x.toFixed(4)}</span>
                    <span>Y: {publicKey.y.toFixed(4)}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-[9px] text-emerald-500/70 mb-3 tracking-[0.2em] uppercase font-sans font-bold">Compressed Hash Equivalents</p>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Generator Point</span>
                      <span className="text-zinc-400 font-mono">{generateHexKey(1, 1, "0x02")}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Private Key</span>
                      <span className="text-indigo-300 font-mono">{generatePrivKeyHex(privateKey)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Public Key</span>
                      <span className="text-emerald-400 font-mono">{generateHexKey(publicKey.x, publicKey.y, publicKey.y % 2 === 0 ? "0x02" : "0x03")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-full lg:w-2/3 relative rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] group bg-black/50">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            className="w-full h-full block"
          />
        </div>
      </div>
    </div>
  );
}
