import { useState, useEffect, useRef } from "react";

/**
 * Interactive demonstration of Elliptic Curve Cryptography key generation using Canvas API.
 * @returns {JSX.Element}
 */
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

    ctx.strokeStyle = "#3f3f46";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, offsetY);
    ctx.lineTo(width, offsetY);
    ctx.moveTo(offsetX, 0);
    ctx.lineTo(offsetX, height);
    ctx.stroke();

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

    const gX = 1;
    const gY = 1;
    const pxG = offsetX + gX * scale;
    const pyG = offsetY - gY * scale;
    ctx.fillStyle = "#34d399";
    ctx.beginPath();
    ctx.arc(pxG, pyG, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "12px monospace";
    ctx.fillText("G(1, 1)", pxG + 8, pyG - 8);
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

      ctx.lineWidth = 1;
      for (let i = 0; i < currentStepIdx; i++) {
        const step = steps[i];

        ctx.strokeStyle = "rgba(244, 63, 94, 0.4)";
        ctx.beginPath();
        ctx.moveTo(offsetX + step.start.x * scale, offsetY - step.start.y * scale);
        ctx.lineTo(offsetX + step.intersect.x * scale, offsetY - step.intersect.y * scale);
        ctx.stroke();

        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "rgba(52, 211, 153, 0.4)";
        ctx.beginPath();
        ctx.moveTo(offsetX + step.intersect.x * scale, offsetY - step.intersect.y * scale);
        ctx.lineTo(offsetX + step.end.x * scale, offsetY - step.end.y * scale);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#34d399";
        ctx.beginPath();
        ctx.arc(offsetX + step.end.x * scale, offsetY - step.end.y * scale, 3, 0, Math.PI * 2);
        ctx.fill();
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

        if (stepElapsed < halfDuration) {
          const p = stepElapsed / halfDuration;
          const curPx = startPx + (intPx - startPx) * p;
          const curPy = startPy + (intPy - startPy) * p;

          ctx.strokeStyle = "rgba(244, 63, 94, 0.8)";
          ctx.beginPath();
          ctx.moveTo(startPx, startPy);
          ctx.lineTo(curPx, curPy);
          ctx.stroke();
        } else {
          ctx.strokeStyle = "rgba(244, 63, 94, 0.8)";
          ctx.beginPath();
          ctx.moveTo(startPx, startPy);
          ctx.lineTo(intPx, intPy);
          ctx.stroke();

          const p = (stepElapsed - halfDuration) / halfDuration;
          const curPx = intPx + (endPx - intPx) * p;
          const curPy = intPy + (endPy - intPy) * p;

          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = "rgba(52, 211, 153, 0.8)";
          ctx.beginPath();
          ctx.moveTo(intPx, intPy);
          ctx.lineTo(curPx, curPy);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setPublicKey(current);
        setIsAnimating(false);

        const px = offsetX + current.x * scale;
        const py = offsetY - current.y * scale;
        ctx.fillStyle = "#10b981";
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
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
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <h3 className="text-2xl md:text-3xl font-bold text-indigo-400 mb-3">
          Elliptic Curve Cryptography
        </h3>
        <p className="text-zinc-400 text-sm leading-relaxed">
          A Public Key is derived from a Private Key through scalar
          multiplication with a fixed Generator Point (G) on an elliptic curve.
          This one-way mathematical function is computationally infeasible to
          reverse.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="w-full md:w-1/3 space-y-6">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 hover:border-indigo-500/30 transition-colors">
            <label className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-4 block">
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
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white font-mono text-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-700"
            />
            <p className="text-[11px] text-zinc-600 mt-2">
              Number of point additions starting from G(1, 1).
            </p>
          </div>
          
          <div className="flex flex-col gap-3">
            <button
              id="ecc-generate-btn"
              onClick={handleGenerate}
              disabled={!privateKey || parseInt(privateKey, 10) <= 0 || isAnimating}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.6)] disabled:shadow-none"
            >
              {isAnimating ? "Calculating..." : "Generate Public Key"}
            </button>
            {(publicKey || isAnimating) && (
              <button
                onClick={handleReset}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-6 py-3 rounded-xl font-medium transition-colors"
              >
                Reset
              </button>
            )}
          </div>
          
          {publicKey !== null && (
            <div className="bg-zinc-900/40 border border-indigo-500/20 rounded-2xl p-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-indigo-400 font-semibold text-sm">
                  Final Public Key
                </span>
              </div>
              <p className="text-emerald-400 text-lg font-mono mb-1">
                x: {publicKey.x.toFixed(4)}
              </p>
              <p className="text-emerald-400 text-lg font-mono mb-2">
                y: {publicKey.y.toFixed(4)}
              </p>
            </div>
          )}
        </div>

        <div className="w-full md:w-2/3 bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden flex items-center justify-center p-4">
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            className="w-full h-auto bg-zinc-950 rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}
