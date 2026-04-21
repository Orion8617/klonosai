// ─── Layer 4: SciCanvas — C. elegans SNN Hexagonal Visualization ─────────────
// Inputs:  engine/snn (NeuronBank, SynapseBank, pascalImp, lodR, vigesimal,
//                      PASCAL_CULL, BILATERAL_K, THETA_PERIOD, LANE_*)
// Output:  <canvas id="sci-canvas"> + spike count callback
import { useEffect, useRef } from "react";
import {
  NeuronBank, SynapseBank,
  pascalImp, lodR, vigesimal,
  PASCAL_CULL, BILATERAL_K, THETA_PERIOD,
  LANE_ORANGE, LANE_CYAN,
} from "../engine/snn";

// Stimulus tuning constants
const NOISE_OFFSET    = 0.3;   // bias toward excitation
const NOISE_SCALE     = 4;     // noise amplitude (mA)
const STIM_PERIOD     = 17;    // deterministic stimulus period (frames)
const STIM_STRENGTH   = 5;     // deterministic stimulus amplitude (mA)
const SCHUMANN_PERIOD = 3;     // fraction of neurons boosted on Schumann pulse
const SCHUMANN_BOOST  = 6;     // Schumann pulse amplitude (mA)

export function SciCanvas({ onSpk }: { onSpk: (n: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Capture the latest callback in a ref so the animation effect never needs
  // to restart when the parent re-renders with a new onSpk reference.
  const onSpkRef = useRef(onSpk);
  useEffect(() => { onSpkRef.current = onSpk; }, [onSpk]);

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const cx = cv.getContext("2d")!;
    let W = 0, H = 0, raf = 0, resizeRaf = 0;

    const cols = 9, rows = 8, dx = 46, dy = 40;
    const DIST_MAX = dx * 1.65;
    const NN = rows * cols;  // 72 neurons

    // SoA neuron bank — state is preserved across resizes (no reset on resize)
    const bank = new NeuronBank(NN);
    for (let i = 0; i < NN; i++) {
      bank.v[i] = -65 + (Math.random() - 0.5) * 15;
      bank.u[i] = -13;
      bank.l[i] = (i % cols) < (cols / 2) ? LANE_ORANGE : LANE_CYAN;
    }

    // Build SynapseBank
    const rawSyns: Array<[number, number, number]> = [];
    for (let i = 0; i < NN * 4; i++) {
      const a = Math.floor(Math.random() * NN), b = Math.floor(Math.random() * NN);
      if (a !== b) rawSyns.push([a, b, (Math.random() - 0.5) * 0.6]);
    }
    const syBank = new SynapseBank(rawSyns.length);
    for (let i = 0; i < rawSyns.length; i++) {
      syBank.a[i] = rawSyns[i][0]; syBank.b[i] = rawSyns[i][1]; syBank.w[i] = rawSyns[i][2];
    }

    // Pre-allocated buffers — no per-frame heap allocation
    const inp    = new Float32Array(NN);
    const active = new Uint16Array(NN);  // firing neuron indices
    let activeLen = 0;
    let edges: [number, number][] = [];
    let sciPw = new Float32Array(NN);

    // Rebuild grid positions and topology (called on first render and on resize).
    // Neuron state (v, u, f, l) is intentionally preserved across resizes.
    function buildPositions() {
      const ox = (W - (cols - 1) * dx) / 2, oy = (H - (rows - 1) * dy) / 2;
      let idx = 0;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++, idx++) {
          bank.x[idx] = ox + c * dx + (r % 2 ? dx / 2 : 0);
          bank.y[idx] = oy + r * dy;
        }
      // Rebuild geometry edges
      edges = [];
      for (let a = 0; a < NN; a++)
        for (let b = a + 1; b < NN; b++)
          if (Math.hypot(bank.x[b] - bank.x[a], bank.y[b] - bank.y[a]) < DIST_MAX)
            edges.push([a, b]);
      // Recompute per-neuron Pascal importance
      for (let i = 0; i < NN; i++) sciPw[i] = pascalImp(bank.x[i], bank.y[i], W, H);
    }

    // Throttle canvas resize to one update per animation frame
    function onResize() {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        if (!cv) return;
        W = cv.width = cv.offsetWidth;
        H = cv.height = cv.offsetHeight;
        buildPositions();
      });
    }
    W = cv.width = cv.offsetWidth; H = cv.height = cv.offsetHeight;
    buildPositions();
    window.addEventListener("resize", onResize);

    // SpikeForge edge buckets — reused every frame
    const oBkt = new Map<number, number[]>();
    const cBkt = new Map<number, number[]>();
    let tk = 0, sc2 = 0, thetaPhase = 0, spkAcc = 0;

    function draw() {
      raf = requestAnimationFrame(draw);
      if (document.hidden) return;
      tk++;
      cx.fillStyle = "rgba(2,12,24,.25)"; cx.fillRect(0, 0, W, H);

      // Schumann 7.83Hz + Theta scheduler — emit spike count on theta tick
      sc2 += 7.83 / 60; const sf2 = sc2 >= 1; if (sf2) sc2 -= 1;
      thetaPhase++;
      if (thetaPhase >= THETA_PERIOD) {
        thetaPhase = 0;
        for (let i = 0; i < NN; i++) sciPw[i] = pascalImp(bank.x[i], bank.y[i], W, H);
        onSpkRef.current(spkAcc);
        spkAcc = 0;
      }

      // SNN step — accumulate synaptic current, add noise/stimulus, batch-step all neurons
      inp.fill(0);
      syBank.accumulate(inp, bank.f, 9);
      for (let i = 0; i < NN; i++) {
        inp[i] += (Math.random() - NOISE_OFFSET) * NOISE_SCALE
                + (i % STIM_PERIOD === tk % STIM_PERIOD ? STIM_STRENGTH : 0)
                + (sf2 && i % SCHUMANN_PERIOD === 0 ? SCHUMANN_BOOST : 0);
      }
      spkAcc += bank.stepAll(inp);

      // Stage 3: Vigesimal edge batches + Stage 1 Pascal gate + §10 Bilateral
      oBkt.clear(); cBkt.clear();
      for (let e = 0; e < edges.length; e++) {
        const [a, b] = edges[e];
        if (!bank.f[a] && !bank.f[b]) continue;
        const imp = Math.max(sciPw[a], sciPw[b]);
        if (imp < PASCAL_CULL) continue;
        const srcFa = bank.f[a], srcFb = bank.f[b];
        const srcF  = srcFa >= srcFb ? srcFa : srcFb;
        const srcL  = srcFa >= srcFb ? bank.l[a] : bank.l[b];
        let alpha = vigesimal(0.1 + srcF / 12 * 0.2);
        if (bank.l[a] !== bank.l[b]) alpha *= BILATERAL_K;
        alpha = vigesimal(alpha);
        if (alpha < 0.04) continue;
        const bkt = srcL ? oBkt : cBkt;
        let arr = bkt.get(alpha); if (!arr) { arr = []; bkt.set(alpha, arr); }
        arr.push(bank.x[a], bank.y[a], bank.x[b], bank.y[b]);
      }
      cx.lineWidth = 0.6;
      oBkt.forEach((segs, alpha) => { cx.strokeStyle = `rgba(255,122,26,${alpha})`; cx.beginPath(); for (let i = 0; i < segs.length; i += 4) { cx.moveTo(segs[i], segs[i+1]); cx.lineTo(segs[i+2], segs[i+3]); } cx.stroke(); });
      cBkt.forEach((segs, alpha) => { cx.strokeStyle = `rgba(0,212,255,${alpha})`; cx.beginPath(); for (let i = 0; i < segs.length; i += 4) { cx.moveTo(segs[i], segs[i+1]); cx.lineTo(segs[i+2], segs[i+3]); } cx.stroke(); });

      // Stage 1+2: Pascal-gated LOD hexagon renderer
      activeLen = 0;
      cx.shadowBlur = 0; cx.shadowColor = "transparent";
      for (let i = 0; i < NN; i++) {
        if (bank.f[i] > 0) { active[activeLen++] = i; continue; }
        const imp = sciPw[i];
        if (imp < PASCAL_CULL) continue;
        const op = 0.1 + Math.max(0, (bank.v[i] + 65) / 75) * 0.28;
        if (op < 0.048) continue;
        cx.fillStyle = `rgba(${bank.l[i] ? "255,122,26" : "0,212,255"},${op.toFixed(2)})`;
        const sz = lodR(imp) * 2;
        cx.beginPath();
        for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 - Math.PI / 6; cx.lineTo(bank.x[i] + sz * Math.cos(a), bank.y[i] + sz * Math.sin(a)); }
        cx.closePath(); cx.fill();
      }
      for (let i = 0; i < activeLen; i++) {
        const idx = active[i];
        cx.shadowColor = bank.l[idx] ? "#ff7a1a" : "#00d4ff"; cx.shadowBlur = 20;
        cx.fillStyle   = bank.l[idx] ? "#ff7a1a" : "#00d4ff";
        cx.beginPath();
        for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 - Math.PI / 6; cx.lineTo(bank.x[idx] + 7 * Math.cos(a), bank.y[idx] + 7 * Math.sin(a)); }
        cx.closePath(); cx.fill();
      }
      cx.shadowBlur = 0; cx.shadowColor = "transparent";
    }

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      window.removeEventListener("resize", onResize);
    };
  }, []); // stable: onSpk captured via onSpkRef above

  return <canvas ref={ref} id="sci-canvas" />;
}
