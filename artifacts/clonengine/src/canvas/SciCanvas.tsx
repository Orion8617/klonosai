// ─── Layer 4: SciCanvas — C. elegans SNN Hexagonal Visualization ─────────────
// Inputs:  engine/snn (Neuron, izhi, pascalImp, lodR, PASCAL_CULL, BILATERAL_K, THETA_PERIOD)
// Output:  <canvas id="sci-canvas"> + spike count callback
import { useEffect, useRef } from "react";
import { Neuron, izhi, pascalImp, lodR, vigesimal, PASCAL_CULL, BILATERAL_K, THETA_PERIOD } from "../engine/snn";

export function SciCanvas({ onSpk }: { onSpk: (n: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const cx = cv.getContext("2d")!;
    let W = 0, H = 0, raf = 0;
    function rs() { if (!cv) return; W = cv.width = cv.offsetWidth; H = cv.height = cv.offsetHeight; }
    rs(); window.addEventListener("resize", rs);

    const cols = 9, rows = 8, dx = 46, dy = 40;
    const DIST_MAX = dx * 1.65;
    const ns: Neuron[] = [];
    let edges: [number, number][] = [];
    let sciPw = new Float32Array(0);

    function buildGrid() {
      const ox = (W - (cols - 1) * dx) / 2, oy = (H - (rows - 1) * dy) / 2;
      ns.length = 0;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          ns.push({ x: ox + c * dx + (r % 2 ? dx / 2 : 0), y: oy + r * dy, v: -65 + (Math.random() - .5) * 15, u: -13, f: 0, l: c < cols / 2 });
      edges = [];
      for (let a = 0; a < ns.length; a++)
        for (let b = a + 1; b < ns.length; b++)
          if (Math.hypot(ns[b].x - ns[a].x, ns[b].y - ns[a].y) < DIST_MAX) edges.push([a, b]);
      sciPw = new Float32Array(ns.length);
      for (let i = 0; i < ns.length; i++) sciPw[i] = pascalImp(ns[i].x, ns[i].y, W, H);
    }
    buildGrid();
    window.addEventListener("resize", buildGrid);

    // Synaptic connections
    const sy: { a: number; b: number; w: number }[] = [];
    for (let i = 0; i < ns.length * 4; i++) {
      const a = Math.floor(Math.random() * ns.length), b = Math.floor(Math.random() * ns.length);
      if (a !== b) sy.push({ a, b, w: (Math.random() - .5) * .6 });
    }

    // SpikeForge edge buckets — reused every frame
    const oBkt = new Map<number, number[]>();
    const cBkt = new Map<number, number[]>();
    let tk = 0, tot = 0, sc2 = 0, thetaPhase = 0;

    function draw() {
      raf = requestAnimationFrame(draw);
      if (document.hidden) return;
      tk++; tot = 0;
      cx.fillStyle = "rgba(2,12,24,.25)"; cx.fillRect(0, 0, W, H);

      // Schumann 7.83Hz + Theta scheduler
      sc2 += 7.83 / 60; const sf2 = sc2 >= 1; if (sf2) sc2 -= 1;
      thetaPhase++; if (thetaPhase >= THETA_PERIOD) { thetaPhase = 0; for (let i = 0; i < ns.length; i++) sciPw[i] = pascalImp(ns[i].x, ns[i].y, W, H); }

      // SNN step
      const inp = new Float32Array(ns.length);
      for (let i = 0; i < sy.length; i++) { const s = sy[i]; if (ns[s.a].f > 0) inp[s.b] += s.w * 9; }
      for (let i = 0; i < ns.length; i++) {
        const n = ns[i];
        const I = inp[i] + (Math.random() - .3) * 4 + (i % 17 === tk % 17 ? 5 : 0) + (sf2 && i % 3 === 0 ? 6 : 0);
        if (n.f === 0 && n.v < -62 && Math.abs(I) < 1.5) { n.v += .04 * n.v * n.v * .002 + I * .04; }
        else { if (izhi(n, I)) tot++; }
      }

      // Stage 3: Vigesimal edge batches + Stage 1 Pascal gate + §10 Bilateral
      oBkt.clear(); cBkt.clear();
      for (let e = 0; e < edges.length; e++) {
        const [a, b] = edges[e];
        const na = ns[a], nb = ns[b];
        if (!na.f && !nb.f) continue;
        const imp = Math.max(sciPw[a], sciPw[b]);
        if (imp < PASCAL_CULL) continue;
        const src = na.f >= nb.f ? na : nb;
        let alpha = vigesimal(.1 + src.f / 12 * .2);
        if (na.l !== nb.l) alpha *= BILATERAL_K;
        alpha = vigesimal(alpha);
        if (alpha < 0.04) continue;
        const bkt = src.l ? oBkt : cBkt;
        let arr = bkt.get(alpha); if (!arr) { arr = []; bkt.set(alpha, arr); }
        arr.push(na.x, na.y, nb.x, nb.y);
      }
      cx.lineWidth = .6;
      oBkt.forEach((segs, alpha) => { cx.strokeStyle = `rgba(255,122,26,${alpha})`; cx.beginPath(); for (let i = 0; i < segs.length; i += 4) { cx.moveTo(segs[i], segs[i+1]); cx.lineTo(segs[i+2], segs[i+3]); } cx.stroke(); });
      cBkt.forEach((segs, alpha) => { cx.strokeStyle = `rgba(0,212,255,${alpha})`; cx.beginPath(); for (let i = 0; i < segs.length; i += 4) { cx.moveTo(segs[i], segs[i+1]); cx.lineTo(segs[i+2], segs[i+3]); } cx.stroke(); });

      // Stage 1+2: Pascal-gated LOD hexagon renderer
      const active: Neuron[] = [];
      cx.shadowBlur = 0; cx.shadowColor = "transparent";
      for (let i = 0; i < ns.length; i++) {
        const n = ns[i];
        if (n.f > 0) { active.push(n); continue; }
        const imp = sciPw[i];
        if (imp < PASCAL_CULL) continue;
        const op = .1 + Math.max(0, (n.v + 65) / 75) * .28;
        if (op < 0.048) continue;
        cx.fillStyle = `rgba(${n.l ? "255,122,26" : "0,212,255"},${op.toFixed(2)})`;
        const sz = lodR(imp) * 2;
        cx.beginPath();
        for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 - Math.PI / 6; cx.lineTo(n.x + sz * Math.cos(a), n.y + sz * Math.sin(a)); }
        cx.closePath(); cx.fill();
      }
      for (let i = 0; i < active.length; i++) {
        const n = active[i];
        cx.shadowColor = n.l ? "#ff7a1a" : "#00d4ff"; cx.shadowBlur = 20;
        cx.fillStyle = n.l ? "#ff7a1a" : "#00d4ff";
        cx.beginPath();
        for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 - Math.PI / 6; cx.lineTo(n.x + 7 * Math.cos(a), n.y + 7 * Math.sin(a)); }
        cx.closePath(); cx.fill();
      }
      cx.shadowBlur = 0; cx.shadowColor = "transparent";

      onSpk(tot);
    }

    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", rs); window.removeEventListener("resize", buildGrid); };
  }, [onSpk]);

  return <canvas ref={ref} id="sci-canvas" />;
}
